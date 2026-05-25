/**
 * Distribution Integration Manager
 * Handles loading, caching, and managing server/version data from distribution.json
 */

const { LoggerUtil } = require('helios-core')
const fs = require('fs-extra')
const path = require('path')
const ConfigManager = require('./configmanager')
const { detectJavaInstallations, validateJava, getRecommendedJavaVersion } = require('./javamanager')

const logger = LoggerUtil.getLogger('DistroIntegration')

let cachedServers = null
let cachedVersions = null

/**
 * Get all available server/version combinations from distribution
 * @returns {Array<Object>} Array of available servers with versions
 */
function getAvailableVersions() {
    if (cachedVersions) return cachedVersions
    
    try {
        // This would load from helios-core distribution manager
        // For now, return placeholder structure
        cachedVersions = [
            {
                id: 'vanilla-1.20',
                name: 'Vanilla 1.20',
                minecraftVersion: '1.20',
                type: 'vanilla'
            },
            {
                id: 'vanilla-1.19',
                name: 'Vanilla 1.19',
                minecraftVersion: '1.19',
                type: 'vanilla'
            },
            {
                id: 'modded-1.20',
                name: 'Modded 1.20',
                minecraftVersion: '1.20',
                type: 'forge',
                mods: []
            }
        ]
        logger.info(`Loaded ${cachedVersions.length} available versions`)
    } catch (e) {
        logger.error('Failed to load versions:', e)
        cachedVersions = []
    }
    
    return cachedVersions
}

/**
 * Get recommended Java for a specific version
 * @param {string} versionId The version ID
 * @returns {Object} Java recommendation
 */
function getJavaRecommendation(versionId) {
    const version = getAvailableVersions().find(v => v.id === versionId)
    if (!version) return null
    
    const mcVersion = version.minecraftVersion
    const recommendedMajor = getRecommendedJavaVersion(mcVersion)
    
    // Find best installed Java
    const installations = detectJavaInstallations()
    const best = installations.find(j => parseInt(j.version.split('.')[0]) === recommendedMajor)
    
    return {
        minecraftVersion: mcVersion,
        recommended: `Java ${recommendedMajor}`,
        foundJava: best || null,
        alternatives: installations
    }
}

/**
 * Set Java for a specific server
 * @param {string} serverId The server ID
 * @param {string} javaPath The Java executable path
 * @returns {boolean} Success
 */
function setJavaForServer(serverId, javaPath) {
    try {
        const validation = validateJava(javaPath)
        if (!validation) {
            logger.error(`Invalid Java at ${javaPath}`)
            return false
        }
        
        ConfigManager.setJavaExecutable(serverId, javaPath)
        ConfigManager.save()
        logger.info(`Java set for ${serverId}: ${javaPath} (${validation.version})`)
        return true
    } catch (e) {
        logger.error(`Failed to set Java: ${e.message}`)
        return false
    }
}

/**
 * Auto-setup Java for all servers
 * @returns {Object} Setup status for each server
 */
function autoSetupJavaForAllServers() {
    const versions = getAvailableVersions()
    const status = {}
    
    for (const version of versions) {
        const recommendation = getJavaRecommendation(version.id)
        if (recommendation && recommendation.foundJava) {
            const success = setJavaForServer(version.id, recommendation.foundJava.path)
            status[version.id] = {
                success,
                java: recommendation.foundJava.version
            }
        } else {
            status[version.id] = {
                success: false,
                message: 'No suitable Java found'
            }
        }
    }
    
    return status
}

module.exports = {
    getAvailableVersions,
    getJavaRecommendation,
    setJavaForServer,
    autoSetupJavaForAllServers
}
