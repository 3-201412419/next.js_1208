import { NextResponse } from 'next/server';

interface Game {
    appid: number;
    name: string;
    genres?: string[];
    header_image?: string;
    description?: string;
    review_score?: number;
    total_reviews?: number;
    review_score_desc?: string;
    playtime_forever: number;
    time_stats?: {
        daily: {
            label: string;
            value: number;
        }[];
        weekly: {
            label: string;
            value: number;
            percentage: number;
        }[];
        monthly: {
            label: string;
            value: number;
            average: number;
        }[];
        summary: {
            total_hours: number;
            recent_hours: number;
            daily_average: number;
            weekly_average: number;
        };
    };
}

// 시간별 통계 데이터 생성 함수
const generateTimeStats = (game: Game, recentGameData: any) => {
    // 기본 데이터 계산
    const totalMinutes = game.playtime_forever || 0;
    const recentMinutes = recentGameData?.playtime_2weeks || 0;
    
    // 평균 계산
    const totalDays = Math.max(1, Math.ceil(totalMinutes / (60 * 24))); // 최소 1일
    const dailyAverage = totalMinutes / totalDays;
    const weeklyAverage = dailyAverage * 7;

    // 1. 일간 데이터 (최근 7일)
    const daily = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        let value = 0;
        if (i < 7 && recentMinutes > 0) {
            // 최근 2주 데이터가 있으면 일평균 사용
            value = recentMinutes / 14;
        }

        return {
            label: `${date.getMonth() + 1}/${date.getDate()}`,
            value: Math.round(value)
        };
    }).reverse();

    // 2. 주간 데이터 (최근 4주)
    const weekly = Array.from({ length: 4 }, (_, i) => {
        let value = 0;
        if (i < 2 && recentMinutes > 0) {
            // 최근 2주는 실제 데이터 사용
            value = recentMinutes / 2;
        } else {
            // 나머지는 전체 평균 사용
            value = weeklyAverage;
        }

        return {
            label: i === 0 ? '이번주' : i === 1 ? '지난주' : `${4-i}주 전`,
            value: Math.round(value),
            percentage: Math.round((value / weeklyAverage) * 100)
        };
    });

    // 3. 월간 데이터 (최근 6개월)
    const monthly = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        let value = 0;
        if (i === 0 && recentMinutes > 0) {
            // 이번 달은 최근 2주 데이터를 기반으로 예측
            value = (recentMinutes / 14) * 30;
        } else {
            // 나머지 달은 전체 평균 사용
            value = dailyAverage * 30;
        }

        return {
            label: `${date.getMonth() + 1}월`,
            value: Math.round(value),
            average: Math.round(dailyAverage * 30)
        };
    }).reverse();

    // 4. 요약 통계
    const summary = {
        total_hours: Math.round(totalMinutes / 60),
        recent_hours: Math.round(recentMinutes / 60),
        daily_average: Math.round(dailyAverage),
        weekly_average: Math.round(weeklyAverage)
    };

    return {
        daily,
        weekly,
        monthly,
        summary
    };
};

export async function GET(request: Request) {
    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId') || process.env.STEAM_ID;

    if (!steamId) {
        return new Response(JSON.stringify({ error: 'Steam ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 사용자 프로필 정보 가져오기
        const profileResponse = await fetch(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        const profileData = await profileResponse.json();
        const userProfile = profileData.response.players[0];

        // 소유한 게임 목록 가져오기
        const gamesResponse = await fetch(
            `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1`
        );
        const gamesData = await gamesResponse.json();
        const games = gamesData.response.games || [];

        // 첫 번째 게임 객체의 구조 확인
        if (games.length > 0) {
            console.log('First game object structure:', JSON.stringify(games[0], null, 2));
        }

        // 2. 각 게임의 상세 정보 가져오기
        const gamesWithDetails = await Promise.all(
            games.map(async (game: Game) => {
                try {
                    // 게임 상세 정보 가져오기
                    const detailsResponse = await fetch(
                        `http://store.steampowered.com/api/appdetails?appids=${game.appid}`,
                        {
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        }
                    );

                    let details;
                    try {
                        const detailsData = await detailsResponse.json();
                        details = detailsData[game.appid]?.data;
                    } catch (error) {
                        console.error('Error parsing game details:', error);
                        details = null;
                    }

                    // 게임 리뷰 정보 가져오기
                    const reviewsResponse = await fetch(
                        `https://store.steampowered.com/appreviews/${game.appid}?json=1`,
                        {
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        }
                    );

                    let reviewsData;
                    try {
                        reviewsData = await reviewsResponse.json();
                    } catch (error) {
                        console.error('Error parsing reviews:', error);
                        reviewsData = { query_summary: {} };
                    }

                    // Steam API에서 최근 2주간의 플레이 시간 데이터 가져오기
                    const recentPlayTimeResponse = await fetch(
                        `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`
                    );

                    let recentGameData;
                    try {
                        const recentPlayTimeData = await recentPlayTimeResponse.json();
                        recentGameData = recentPlayTimeData.response.games?.find((g: any) => g.appid === game.appid);
                    } catch (error) {
                        console.error('Error parsing recent playtime:', error);
                        recentGameData = null;
                    }

                    return {
                        ...game,
                        genres: details?.genres?.map((g: any) => ({
                            id: g.id || `genre-${g.description}`,
                            description: g.description
                        })) || [],
                        header_image: details?.header_image || '',
                        description: details?.short_description || '',
                        review_score: reviewsData?.query_summary?.review_score || 0,
                        total_reviews: reviewsData?.query_summary?.total_reviews || 0,
                        review_score_desc: reviewsData?.query_summary?.review_score_desc || '',
                        time_stats: generateTimeStats(game, recentGameData)
                    };
                } catch (error) {
                    console.error('Error fetching game details:', error);
                    return {
                        ...game,
                        genres: [],
                        header_image: '',
                        description: '',
                        review_score: 0,
                        total_reviews: 0,
                        review_score_desc: '',
                        time_stats: generateTimeStats(game, null)
                    };
                }
            })
        );

        return NextResponse.json({
            userProfile: {
                steamid: userProfile.steamid,
                personaname: userProfile.personaname,
                avatarfull: userProfile.avatarfull,
                profileurl: userProfile.profileurl
            },
            games: gamesWithDetails
        });
    } catch (error) {
        return NextResponse.json({ error: '게임 정보를 가져오는데 실패했습니다' }, { status: 500 });
    }
}