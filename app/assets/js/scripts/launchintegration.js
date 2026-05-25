/**
 * Launch Integration Script
 * Integrates Java detection with the game launch process
 */

const ProcessBuilder = require('../processbuilder')
const ConfigManager = require('../configmanager')
const DistroIntegration = require('../distrointegration')
const SettingsJanitor = require('./settingsjanitor')
const { LoggerUtil } = require('helios-core')

const logger = LoggerUtil.getLogger('LaunchIntegration')

/**
 * Pre-launch validation and setup
 * @param {string} serverId Server/version ID to launch
 * @returns {Object} Validation result
 */
async function validateLaunchSetup(serverId) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        java: null
    }
    
    try {
        // Check if Java is configured
        let javaExe = ConfigManager.getJavaExecutable(serverId)
        
        if (!javaExe) {
            logger.warn(`No Java configured for ${serverId}, attempting auto-setup...`)
            const autoSetup = DistroIntegration.autoSetupJavaForAllServers()
            if (autoSetup[serverId]?.success) {
                javaExe = ConfigManager.getJavaExecutable(serverId)
                result.warnings.push('Java was automatically configured')
            } else {
                result.valid = false
                result.errors.push('No Java executable found. Please install Java and configure it in settings.')
                return result
            }
        }
        
        // Validate Java still exists
        const validation = SettingsJanitor.validateJavaExists(javaExe)
        if (!validation) {
            result.valid = false
            result.errors.push(`Configured Java no longer exists at: ${javaExe}`)
            return result
        }
        
        result.java = validation
        logger.info(`Java validation passed: ${validation.version}`)
        
    } catch (e) {
        result.valid = false
        result.errors.push(`Launch validation error: ${e.message}`)
        logger.error('Launch validation failed:', e)
    }
    
    return result
}

/**
 * Handle launch errors related to Java
 * @param {Error} error The launch error
 * @returns {string} User-friendly error message
 */
function handleLaunchError(error) {
    const errorStr = error.toString().toLowerCase()
    
    if (errorStr.includes('java') || errorStr.includes('jvm')) {
        return 'Java error: Make sure you have Java installed and configured correctly in Settings.'
    }
    
    if (errorStr.includes('version') || errorStr.includes('unsupported')) {
        return 'Version error: This Minecraft version may not be compatible with your Java version.'
    }
    
    if (errorStr.includes('memory') || errorStr.includes('heap')) {
        return 'Memory error: Try allocating more RAM in Settings.'
    }
    
    return `Launch failed: ${error.message}`
}

module.exports = {
    validateLaunchSetup,
    handleLaunchError
}
