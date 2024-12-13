'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';

interface Genre {
  id: string;
  description: string;
}

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  genres: Genre[];
  header_image: string;
  description: string;
  review_score: number;
  total_reviews: number;
  review_score_desc: string;
  similar_games: Game[];
  user_recommendations: {
    user_id: string;
    username: string;
    rating: number;
    comment: string;
  }[];
}

interface UserProfile {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export default function SteamLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'playtime' | 'name' | 'rating'>('playtime');
  const [steamId, setSteamId] = useState(searchParams.get('steamId') || '');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // URL 업데이트
      if (id) {
        router.push(`?steamId=${id}`);
      } else {
        router.push('/');
      }

      const response = await axios.get(`/steam/games?steamId=${id}`);
      setGames(response.data.games);
      setUserProfile(response.data.userProfile);
    } catch (err) {
      setError('게임 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSteamId = searchParams.get('steamId');
    if (urlSteamId !== null) {
      setSteamId(urlSteamId);
      fetchUserData(urlSteamId);
    } else {
      fetchUserData('');
    }
  }, [searchParams]);

  // 정렬된 게임 목록을 반환하는 함수
  const getSortedGames = () => {
    return [...games].sort((a, b) => {
      switch (sortBy) {
        case 'playtime':
          return b.playtime_forever - a.playtime_forever;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.review_score || 0) - (a.review_score || 0);
        default:
          return 0;
      }
    });
  };

  if (loading) return <div className="p-4">로딩 중....</div>;
  if (error) return <div className="p-4">{error}</div>;

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* Steam ID 검색 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Steam ID를 입력하세요"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter') {
                  fetchUserData(steamId);
                }
              }}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={() => fetchUserData(steamId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            검색
          </button>
        </div>
      </div>

      {/* 사용자 프로필 */}
      {userProfile && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center gap-4">
            <img
              src={userProfile.avatarfull}
              alt={userProfile.personaname}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h2 className="text-xl font-bold">{userProfile.personaname}</h2>
              <a
                href={userProfile.profileurl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Steam 프로필 보기
              </a>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">내 Steam 라이브러리</h1>
      
      {/* 통계 섹션 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">통계</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">총 게임 수</p>
            <p className="text-2xl font-bold">{games.length}개</p>
          </div>
          <div>
            <p className="text-gray-600">총 플레이 시간</p>
            <p className="text-2xl font-bold">{Math.round(games.reduce((acc, game) => acc + game.playtime_forever, 0) / 60)}시간</p>
          </div>
          <div>
            <p className="text-gray-600">평균 플레이 시간</p>
            <p className="text-2xl font-bold">{Math.round(games.reduce((acc, game) => acc + game.playtime_forever, 0) / games.length / 60)}시간</p>
          </div>
        </div>
      </div>

      {/* 정렬 옵션 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-gray-600">정렬:</span>
        <select
          className="p-2 border rounded bg-white"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'playtime' | 'name' | 'rating')}
        >
          <option value="playtime">플레이타임순</option>
          <option value="name">이름순</option>
          <option value="rating">평가순</option>
        </select>
      </div>

      {/* 게임 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getSortedGames().map((game) => (
          <div key={game.appid} className="bg-white rounded-lg shadow overflow-hidden">
            {game.header_image && (
              <img 
                src={game.header_image} 
                alt={game.name} 
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{game.name}</h2>
              <p className="text-gray-600 mb-2">
                플레이 시간: {Math.round(game.playtime_forever / 60)}시간
              </p>
              {game.genres && game.genres.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-gray-500">장르:</p>
                  <div className="flex flex-wrap gap-1">
                    {game.genres.map((genre, index) => (
                      <span 
                        key={`${game.appid}-${genre.id || `genre-${index}`}`}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {genre.description}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {game.description && (
                <p className="text-sm text-gray-600 mb-2">{game.description}</p>
              )}
              {game.review_score_desc && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">
                    평가: {game.review_score_desc}
                  </p>
                  <p className="text-xs text-gray-500">
                    총 {game.total_reviews.toLocaleString()}개의 리뷰
                  </p>
                </div>
              )}
              {/* 게임 추천 섹션 */}
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">비슷한 게임 추천</h3>
                <div className="grid grid-cols-2 gap-2">
                  {game.similar_games?.slice(0, 4).map((similar) => (
                    <div key={`${game.appid}-${similar.appid}`} className="text-sm">
                      <img
                        src={similar.header_image}
                        alt={similar.name}
                        className="w-full h-20 object-cover rounded"
                      />
                      <p className="mt-1 font-medium truncate">{similar.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* 다른 사용자 평가 */}
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">다른 사용자 평가</h3>
                <div className="space-y-2">
                  {game.user_recommendations?.slice(0, 3).map((rec) => (
                    <div key={`${game.appid}-${rec.user_id}`} className="bg-gray-50 p-2 rounded">
                      <p className="font-medium">{rec.username}</p>
                      <div className="flex items-center text-yellow-500">
                        {'★'.repeat(rec.rating)}{'☆'.repeat(5-rec.rating)}
                      </div>
                      <p className="text-sm text-gray-600">{rec.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
