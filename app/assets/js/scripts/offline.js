/**
 * EVO LAUNCHER â€” Offline Mode Script
 * Handles offline login (username only, no auth) and switching back to online mode.
 */

const crypto = require('crypto')

const offlineUsername     = document.getElementById('offlineUsername')
const offlineLoginButton  = document.getElementById('offlineLoginButton')
const offlineUsernameError = document.getElementById('offlineUsernameError')
const offlineSwitchOnline = document.getElementById('offlineSwitchOnline')

const OFFLINE_USERNAME_KEY = 'evo_offline_username'

/**
 * Validate the offline username.
 * Must be 3â€“16 characters, alphanumeric + underscore only.
 * @param {string} val
 * @returns {boolean}
 */
function validateOfflineUsername(val) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(val)
}

// Restore last used offline username
const savedOfflineName = localStorage.getItem(OFFLINE_USERNAME_KEY)
if (savedOfflineName) {
    offlineUsername.value = savedOfflineName
    offlineLoginButton.disabled = !validateOfflineUsername(savedOfflineName)
}

// Live validation on input
offlineUsername.addEventListener('input', () => {
    const val = offlineUsername.value.trim()
    const valid = validateOfflineUsername(val)
    offlineLoginButton.disabled = !valid
    if (val.length > 0 && !valid) {
        offlineUsernameError.style.display = 'block'
    } else {
        offlineUsernameError.style.display = 'none'
    }
})

// Login offline â€” create a fake offline account entry
offlineLoginButton.addEventListener('click', () => {
    const username = offlineUsername.value.trim()
    if (!validateOfflineUsername(username)) return

    localStorage.setItem(OFFLINE_USERNAME_KEY, username)

    // Generate a deterministic offline UUID from the username.
    const offlineUUID = generateOfflineUUID(username)

    ConfigManager.addOfflineAuthAccount(offlineUUID, username)
    ConfigManager.save()

    updateSelectedAccount(ConfigManager.getSelectedAccount())

    switchView(getCurrentView(), VIEWS.landing, 500, 500, () => {
        offlineUsernameError.style.display = 'none'
    })
})

// Switch back to online mode
offlineSwitchOnline.addEventListener('click', () => {
    loginOptionsCancelEnabled(false)
    loginOptionsViewOnLoginSuccess = VIEWS.landing
    loginOptionsViewOnLoginCancel  = VIEWS.loginOptions
    switchView(getCurrentView(), VIEWS.loginOptions, 500, 500)
})

/**
 * Generate a deterministic UUID from a username string.
 * Mimics Minecraft's offline UUID generation (md5 of "OfflinePlayer:<name>").
 * @param {string} username
 * @returns {string} UUID string
 */
function generateOfflineUUID(username) {
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest()

    hash[6] = (hash[6] & 0x0f) | 0x30
    hash[8] = (hash[8] & 0x3f) | 0x80

    const hex = hash.toString('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
