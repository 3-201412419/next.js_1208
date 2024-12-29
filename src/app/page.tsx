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
  header_image: string;
  description: string;
  genres: { id: string; description: string }[];
  metacritic?: { score: number };
  release_date: { coming_soon: boolean; date: string };
  developers: string[];
  publishers: string[];
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
  const [steamId, setSteamId] = useState(searchParams.get('steamId') || '76561198392922508');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserData = async (id: string) => {
    if (!id) {
      setError('Steam ID를 입력해주세요');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // URL 업데이트
      router.push(`?steamId=${id}`);

      console.log('Fetching data for Steam ID:', id);
      const response = await axios.get(`/api/steam/games?steamId=${id}`);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      console.log('Data received:', response.data);
      setGames(response.data.games || []);
      setUserProfile(response.data.userProfile);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || err.message || '게임 목록을 불러오는데 실패했습니다');
      setGames([]);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSteamId = searchParams.get('steamId') || '76561198392922508';
    setSteamId(urlSteamId);
    fetchUserData(urlSteamId);
  }, [searchParams]);

  // 정렬된 게임 목록을 반환하는 함수
  const getSortedGames = () => {
    return [...games].sort((a, b) => {
      if (sortBy === 'playtime') {
        return b.playtime_forever - a.playtime_forever;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // rating을 metacritic 점수로 변경
      return (b.metacritic?.score || 0) - (a.metacritic?.score || 0);
    });
  };

  if (loading) return <div className="p-4">로딩 중....</div>;
  if (error) return <div className="p-4">{error}</div>;

  const sortedGames = getSortedGames();

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
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'playtime' | 'name' | 'rating')}
          className="ml-2 p-2 border rounded"
        >
          <option value="playtime">플레이타임순</option>
          <option value="name">이름순</option>
          <option value="rating">Metacritic 점수순</option>
        </select>
      </div>

      {/* 게임 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sortedGames.map((game) => (
          <div
            key={game.appid}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            {game.header_image && (
              <img
                src={game.header_image}
                alt={game.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{game.name}</h3>
              {game.description && (
                <p className="text-gray-600 mb-2">{game.description}</p>
              )}
              <p className="text-gray-500 mb-2">
                플레이 시간: {Math.round(game.playtime_forever / 60)} 시간
              </p>
              {game.genres && game.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {game.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {genre.description}
                    </span>
                  ))}
                </div>
              )}
              {game.metacritic && (
                <p className="text-gray-600 mb-2">
                  Metacritic: {game.metacritic.score}
                </p>
              )}
              {game.developers && (
                <p className="text-gray-600 text-sm">
                  개발사: {game.developers.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
