import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScriptPath = path.join(__dirname, '../python/apple_bridge.py');

/**
 * Runs the Python Apple Music bridge script
 * @param {string} action - Action to perform (e.g., 'create-playlist')
 * @param {string[]} args - Additional arguments
 * @returns {Promise<any>} - The JSON parsed output
 */
function runPythonBridge(action, args = [], timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    execFile('python', [pythonScriptPath, action, ...args], { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        console.error('Python execution error:', error);
        if (error.killed || error.signal === 'SIGTERM') {
          return reject(new Error('Apple Music bridge timed out. Please try again.'));
        }
        return reject(new Error(`Python execution failed: ${stderr || error.message}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          return reject(new Error(result.error || 'Unknown python bridge error'));
        }
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdout);
        reject(new Error(`Invalid response from Python bridge: ${stdout}`));
      }
    });
  });
}

/**
 * Creates an Apple Music playlist using the Python script
 */
export async function createApplePlaylist(devToken, userToken, title, trackIds) {
  try {
    const args = [devToken, userToken, title, trackIds.join(',')];

    return new Promise((resolve, reject) => {
      execFile('python', [pythonScriptPath, 'create-playlist', ...args], { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Python execution error:', error);
          if (error.killed || error.signal === 'SIGTERM') {
            return reject(new Error('Apple Music playlist creation timed out. Please try again.'));
          }
          return reject(new Error(`Python execution failed: ${stderr || error.message}`));
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (!result.success) {
            return reject(new Error(result.error || 'Unknown python bridge error'));
          }
          resolve(result.url);
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout);
          reject(new Error(`Invalid response from Python bridge: ${stdout}`));
        }
      });
    });
  } catch (err) {
    console.error('Apple Music createPlaylist error:', err.message);
    throw err;
  }
}

// Wrapper object
export const appleApi = {
  createApplePlaylist,
};