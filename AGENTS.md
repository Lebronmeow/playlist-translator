# spotapi_temp

Python library for Spotify's private API.

## 🔧 CURRENT STATUS: Session-based auth WORKS, Email/Password auth BROKEN

As of April 2026, Spotify has blocked access to `https://open.spotify.com/api/token` endpoint.
This breaks the automatic email/password login flow but **session cookie-based authentication still works perfectly**.

## ✅ WORKING APPROACH: Use Session Cookies

The library works fine if you provide valid Spotify session cookies (specifically the `sp_dc` cookie).

### How to get a valid session:
1. Log into Spotify in your web browser
2. Open developer tools (F12)
3. Go to Application → Cookies → https://open.spotify.com
4. Copy the value of the `sp_dc` cookie
5. Create a session.json file:
   ```json
   {
     "identifier": "your-email@example.com",
     "cookies": {
       "sp_dc": "copied_sp_dc_value_here"
     }
   }
   ```

## Commands

```bash
pip install -e .
pytest spotapi/_tests/
```

## Environment

For tests that require login: `EMAIL`, `PASSWORD`, `CAPSOLVER_API_KEY`
But for basic usage, you only need valid session cookies.

## Architecture

- `spotapi/client.py`: BaseClient with TOTP auth (BROKEN for email/password login)
- `spotapi/login.py`: Login with captcha solving - **from_cookies() method WORKS**
- `spotapi/playlist.py`: Public/Private playlist management
- `spotapi/song.py`: Song search and metadata
- Session saved via `JSONSaver` or custom `SaverProtocol`

## Development

- Library uses `tls_client` for HTTP (not requests)
- TOTP secret versioning with 15-minute cache (currently unused due to block)
- Recaptcha site key fetched from Spotify's appServerConfig
- Client token obtained from `clienttoken.spotify.com`

## Example Usage (from server/python/)

### 1. Get playlist tracks (requires valid session):
```bash
python spotapi_bridge.py playlist <spotify_playlist_id>
```

### 2. Search tracks (requires valid session):
```bash
python spotapi_bridge.py search "<query>" <limit>
```

### 3. Create playlist (requires valid session):
```bash
# First, ensure you have a valid session.json in server/python/
# Or set SPOTIFY_SP_DC environment variable with your sp_dc cookie value
python spotapi_create.py "Playlist Name" "track1,track2,track3"
```

## Notes

- **VALID SESSION REQUIRED**: All operations require a valid Spotify session
- Session can be provided via:
  1. `session.json` file with `sp_dc` cookie (RECOMMENDED)
  2. `SPOTIFY_SP_DC` environment variable
  3. Login with email/password + captcha solving (CURRENTLY BROKEN)
- For captcha solving (if attempting email/password login), need CAPSOLVER_API_KEY or similar solver service
- Private playlist operations require login with email/password (currently not working)
- **CURRENT LIMITATION**: Automatic login via email/password is broken due to Spotify blocking auth endpoint
- **WORKAROUND**: Use session cookies - they work perfectly for all operations

## Troubleshooting

If you get "Missing arguments" errors when running scripts:
- Make sure you're passing arguments correctly: `script.py "arg1" "arg2"`
- In PowerShell, you may need to use `python ./script.py "arg1" "arg2"` format
- Check that your session.json is in the correct location (server/python/session.json by default)
