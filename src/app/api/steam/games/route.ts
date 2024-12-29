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
    
    if (!steamApiKey) {
      console.error('Steam API key is not configured');
      return NextResponse.json(
        { error: 'Steam API key is not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching owned games for Steam ID:', steamId);
    // Steam API 호출
    const ownedGamesResponse = await axios.get(
      `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&format=json&include_appinfo=1`
    );

    console.log('Fetching user profile for Steam ID:', steamId);
    const userProfileResponse = await axios.get(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`
    );

    const games = ownedGamesResponse.data.response.games || [];
    const userProfile = userProfileResponse.data.response.players[0];

    if (!userProfile) {
      console.error('User profile not found for Steam ID:', steamId);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('Successfully fetched data for Steam ID:', steamId);
    return NextResponse.json({
      games,
      userProfile
    });
  } catch (error: any) {
    console.error('Steam API error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch Steam data: ' + (error.response?.data?.message || error.message) },
      { status: 500 }
    );
  }
}
