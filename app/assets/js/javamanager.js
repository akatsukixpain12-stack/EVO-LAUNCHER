const { LoggerUtil } = require('helios-core')
const { execSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')

const logger = LoggerUtil.getLogger('JavaManager')

/**
 * Detect installed Java versions on the system
 * @returns {Array<Object>} Array of detected Java installations
 */
function detectJavaInstallations() {
    const javaInstalls = []
    
    try {
        // Common Java installation paths
        const commonPaths = {
            win32: [
                'C:\\Program Files\\Java',
                'C:\\Program Files (x86)\\Java',
                process.env.JAVA_HOME
            ],
            darwin: [
                '/Library/Java/JavaVirtualMachines',
                process.env.JAVA_HOME,
                '/usr/libexec/java_home'
            ],
            linux: [
                '/usr/lib/jvm',
                process.env.JAVA_HOME
            ]
        }
        
        const paths = commonPaths[process.platform] || []
        
        for (const basePath of paths) {
            if (!basePath || !fs.existsSync(basePath)) continue
            
            try {
                const items = fs.readdirSync(basePath)
                for (const item of items) {
                    const javaPath = path.join(basePath, item, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`)
                    if (fs.existsSync(javaPath)) {
                        try {
                            const version = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8' })
                            const versionMatch = version.match(/version "(.+?)"/)
                            if (versionMatch) {
                                javaInstalls.push({
                                    path: javaPath,
                                    version: versionMatch[1],
                                    basePath: basePath
                                })
                            }
                        } catch (e) {
                            logger.warn(`Failed to detect Java version at ${javaPath}`)
                        }
                    }
                }
            } catch (e) {
                logger.warn(`Error scanning Java path ${basePath}: ${e.message}`)
            }
        }
        
        // Try JAVA_HOME environment variable
        if (process.env.JAVA_HOME) {
            const javaExe = path.join(process.env.JAVA_HOME, 'bin', `java${process.platform === 'win32' ? '.exe' : ''}`)
            if (fs.existsSync(javaExe)) {
                try {
                    const version = execSync(`"${javaExe}" -version 2>&1`, { encoding: 'utf8' })
                    const versionMatch = version.match(/version "(.+?)"/)
                    if (versionMatch && !javaInstalls.some(j => j.path === javaExe)) {
                        javaInstalls.push({
                            path: javaExe,
                            version: versionMatch[1],
                            basePath: process.env.JAVA_HOME
                        })
                    }
                } catch (e) {
                    logger.warn('Failed to detect Java from JAVA_HOME')
                }
            }
        }
        
        // Try 'java' command directly (should be in PATH)
        try {
            const javaExe = process.platform === 'win32' ? 'java.exe' : 'java'
            const version = execSync(`${javaExe} -version 2>&1`, { encoding: 'utf8' })
            const versionMatch = version.match(/version "(.+?)"/)
            if (versionMatch && !javaInstalls.some(j => j.path.includes(javaExe))) {
                javaInstalls.push({
                    path: javaExe,
                    version: versionMatch[1],
                    basePath: 'PATH'
                })
            }
        } catch (e) {
            logger.warn('Java not found in system PATH')
        }
        
    } catch (e) {
        logger.error('Error detecting Java installations:', e)
    }
    
    return javaInstalls
}

/**
 * Get the best Java version for a specific Minecraft version
 * @param {string} minecraftVersion The Minecraft version
 * @returns {string} The recommended Java major version
 */
function getRecommendedJavaVersion(minecraftVersion) {
    const major = parseInt(minecraftVersion.split('.')[0])
    const minor = parseInt(minecraftVersion.split('.')[1]) || 0
    
    if (major === 1 && minor <= 12) return 8
    if (major === 1 && minor <= 16) return 11
    if (major === 1 && minor <= 20) return 16
    return 17
}

/**
 * Validate Java path and return version info
 * @param {string} javaPath Path to java executable
 * @returns {Object|null} Java info or null if invalid
 */
function validateJava(javaPath) {
    try {
        if (!fs.existsSync(javaPath)) return null
        
        const version = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8' })
        const versionMatch = version.match(/version "(.+?)"/)
        
        if (versionMatch) {
            return {
                path: javaPath,
                version: versionMatch[1],
                major: parseInt(versionMatch[1].split('.')[0])
            }
        }
    } catch (e) {
        logger.warn(`Java validation failed for ${javaPath}:`, e.message)
    }
    return null
}

module.exports = {
    detectJavaInstallations,
    getRecommendedJavaVersion,
    validateJava
}
