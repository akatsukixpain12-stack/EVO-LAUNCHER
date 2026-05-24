/**
 * EVO LAUNCHER — Offline Mode Script
 * Handles offline login (username only, no auth) and switching back to online mode.
 */

const offlineUsername     = document.getElementById('offlineUsername')
const offlineLoginButton  = document.getElementById('offlineLoginButton')
const offlineUsernameError = document.getElementById('offlineUsernameError')
const offlineSwitchOnline = document.getElementById('offlineSwitchOnline')

const OFFLINE_USERNAME_KEY = 'evo_offline_username'

/**
 * Validate the offline username.
 * Must be 3–16 characters, alphanumeric + underscore only.
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

// Login offline — create a fake offline account entry
offlineLoginButton.addEventListener('click', () => {
    const username = offlineUsername.value.trim()
    if (!validateOfflineUsername(username)) return

    localStorage.setItem(OFFLINE_USERNAME_KEY, username)

    // Generate a deterministic offline UUID (v3-style from username)
    const offlineUUID = generateOfflineUUID(username)

    // Add as a mojang-style offline account
    ConfigManager.addMojangAuthAccount(offlineUUID, 'offline_token', username, username)
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
    // Simple deterministic hash → UUID v3 format
    const str = 'OfflinePlayer:' + username
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0
    }
    // Pad to 32 hex chars
    const hex = Math.abs(hash).toString(16).padStart(8, '0')
    const pad = (username.length).toString(16).padStart(8, '0')
    const full = (hex + pad + hex + pad).substring(0, 32)
    return `${full.slice(0,8)}-${full.slice(8,12)}-3${full.slice(13,16)}-${full.slice(16,20)}-${full.slice(20,32)}`
}
