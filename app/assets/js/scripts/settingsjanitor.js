/**
 * Settings Janitor - Handles Java setup and configuration validation
 */

const ConfigManager = require('../configmanager')
const { detectJavaInstallations, validateJava } = require('../javamanager')

const logger = {
    info: msg => console.log(`[SettingsJanitor] ${msg}`),
    warn: msg => console.warn(`[SettingsJanitor] ${msg}`),
    error: msg => console.error(`[SettingsJanitor] ${msg}`)
}

/**
 * Ensure valid Java is configured for the server
 * @param {string} serverid The server ID
 * @returns {boolean} True if valid Java is configured
 */
async function ensureJavaConfigured(serverid) {
    let javaExe = ConfigManager.getJavaExecutable(serverid)
    
    // Validate current Java
    if (javaExe && validateJava(javaExe)) {
        logger.info(`Valid Java found at ${javaExe}`)
        return true
    }
    
    logger.warn('No valid Java executable configured, detecting...')
    
    // Try to detect Java
    const installations = detectJavaInstallations()
    
    if (installations.length === 0) {
        logger.error('No Java installations detected!')
        return false
    }
    
    // Use first valid installation
    const best = installations[0]
    logger.info(`Setting Java to ${best.version} at ${best.path}`)
    ConfigManager.setJavaExecutable(serverid, best.path)
    ConfigManager.save()
    
    return true
}

/**
 * Validate all server configurations
 * @returns {Array} Array of issues found
 */
function validateAllConfigs() {
    const issues = []
    
    const servers = ConfigManager.getModConfigurations() || []
    
    for (const config of servers) {
        const serverid = config.id
        const javaExe = ConfigManager.getJavaExecutable(serverid)
        
        if (!javaExe) {
            issues.push({
                severity: 'error',
                server: serverid,
                message: 'No Java executable configured'
            })
        } else if (!validateJava(javaExe)) {
            issues.push({
                severity: 'error',
                server: serverid,
                message: `Invalid Java path: ${javaExe}`
            })
        }
    }
    
    return issues
}

module.exports = {
    ensureJavaConfigured,
    validateAllConfigs
}
