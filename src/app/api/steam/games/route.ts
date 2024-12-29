import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get('steamId');

  if (!steamId) {
    return NextResponse.json({ error: 'Steam ID is required' }, { status: 400 });
  }

  try {
    const steamApiKey = process.env.STEAM_API_KEY;
    
    // Steam API 호출
    const ownedGamesResponse = await axios.get(
      `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&format=json&include_appinfo=1`
    );

    const userProfileResponse = await axios.get(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`
    );

    const games = ownedGamesResponse.data.response.games || [];
    const userProfile = userProfileResponse.data.response.players[0];

    return NextResponse.json({
      games,
      userProfile
    });
  } catch (error) {
    console.error('Steam API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Steam data' },
      { status: 500 }
    );
  }
}
