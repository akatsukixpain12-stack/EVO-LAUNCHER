/**
 * Version Selector Script
 * UI component for selecting and managing different Minecraft versions
 */

const DistroIntegration = require('../distrointegration')
const ConfigManager = require('../configmanager')
const { ipcRenderer } = require('electron')

let selectedVersionId = null
let versionCache = null

/**
 * Initialize version selector UI
 */
function initVersionSelector() {
    const versions = DistroIntegration.getAvailableVersions()
    versionCache = versions
    
    renderVersionList(versions)
    attachEventListeners()
    
    // Load last selected version
    const lastSelected = ConfigManager.getSelectedServer()
    if (lastSelected && versions.some(v => v.id === lastSelected)) {
        selectVersion(lastSelected)
    } else if (versions.length > 0) {
        selectVersion(versions[0].id)
    }
}

/**
 * Render version selection UI
 * @param {Array} versions Available versions
 */
function renderVersionList(versions) {
    const container = document.getElementById('version-selector-list')
    if (!container) {
        console.warn('Version selector container not found')
        return
    }
    
    container.innerHTML = ''
    
    if (versions.length === 0) {
        container.innerHTML = '<p class="no-versions">No versions available</p>'
        return
    }
    
    const list = document.createElement('ul')
    list.className = 'version-list'
    
    versions.forEach(version => {
        const item = document.createElement('li')
        item.className = 'version-item'
        item.dataset.versionId = version.id
        
        item.innerHTML = `
            <div class="version-header">
                <span class="version-name">${version.name}</span>
                <span class="version-type badge badge-${version.type}">${version.type}</span>
            </div>
            <div class="version-details">
                <small>MC ${version.minecraftVersion}</small>
            </div>
            <div class="version-actions">
                <button class="btn-version-select" data-version="${version.id}">Select</button>
                <button class="btn-version-java" data-version="${version.id}">Configure Java</button>
            </div>
        `
        
        list.appendChild(item)
    })
    
    container.appendChild(list)
}

/**
 * Select a version
 * @param {string} versionId Version ID to select
 */
function selectVersion(versionId) {
    const version = versionCache.find(v => v.id === versionId)
    if (!version) return
    
    selectedVersionId = versionId
    ConfigManager.setSelectedServer(versionId)
    ConfigManager.save()
    
    // Update UI
    document.querySelectorAll('.version-item').forEach(el => {
        el.classList.remove('selected')
    })
    document.querySelector(`[data-version-id="${versionId}"]`)?.classList.add('selected')
    
    // Update info panel
    updateVersionInfo(version)
    console.log(`Selected version: ${version.name}`)
}

/**
 * Update version information display
 * @param {Object} version Version object
 */
function updateVersionInfo(version) {
    const infoPanel = document.getElementById('version-info-panel')
    if (!infoPanel) return
    
    const recommendation = DistroIntegration.getJavaRecommendation(version.id)
    
    infoPanel.innerHTML = `
        <div class="info-header">
            <h3>${version.name}</h3>
        </div>
        <div class="info-content">
            <p><strong>Minecraft:</strong> ${version.minecraftVersion}</p>
            <p><strong>Type:</strong> ${version.type}</p>
            ${recommendation ? `
                <p><strong>Recommended Java:</strong> ${recommendation.recommended}</p>
                ${recommendation.foundJava ? `
                    <p class="java-found">✓ Java ${recommendation.foundJava.version} found</p>
                ` : `
                    <p class="java-missing">✗ No suitable Java found - <a href="#">download Java</a></p>
                `}
            ` : ''}
        </div>
    `
}

/**
 * Show Java configuration dialog
 * @param {string} versionId Version ID
 */
function showJavaConfig(versionId) {
    const version = versionCache.find(v => v.id === versionId)
    if (!version) return
    
    const recommendation = DistroIntegration.getJavaRecommendation(versionId)
    
    const dialog = document.createElement('div')
    dialog.className = 'modal java-config-modal'
    dialog.innerHTML = `
        <div class="modal-content">
            <h2>Configure Java for ${version.name}</h2>
            <div class="java-recommendation">
                <p><strong>Recommended:</strong> ${recommendation.recommended}</p>
                ${recommendation.foundJava ? `
                    <p class="found">Found: ${recommendation.foundJava.version}</p>
                ` : `
                    <p class="not-found">No suitable Java found. Alternatives:</p>
                `}
            </div>
            <div class="java-alternatives">
                <h4>Available Java Installations:</h4>
                <ul>
                    ${recommendation.alternatives.map(j => `
                        <li>
                            <input type="radio" name="java-choice" value="${j.path}" id="java-${j.path}" />
                            <label for="java-${j.path}">Java ${j.version}</label>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" id="btn-java-save">Save</button>
                <button class="btn-secondary" id="btn-java-cancel">Cancel</button>
            </div>
        </div>
    `
    
    document.body.appendChild(dialog)
    
    document.getElementById('btn-java-save').addEventListener('click', () => {
        const selected = document.querySelector('input[name="java-choice"]:checked')
        if (selected) {
            if (DistroIntegration.setJavaForServer(versionId, selected.value)) {
                alert('Java configured successfully!')
                dialog.remove()
                selectVersion(versionId) // Refresh display
            } else {
                alert('Failed to set Java')
            }
        }
    })
    
    document.getElementById('btn-java-cancel').addEventListener('click', () => {
        dialog.remove()
    })
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-version-select')) {
            const versionId = e.target.dataset.version
            selectVersion(versionId)
        }
        if (e.target.classList.contains('btn-version-java')) {
            const versionId = e.target.dataset.version
            showJavaConfig(versionId)
        }
    })
}

/**
 * Get currently selected version
 * @returns {string} Selected version ID
 */
function getSelectedVersion() {
    return selectedVersionId
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initVersionSelector,
        selectVersion,
        getSelectedVersion,
        showJavaConfig
    }
}
