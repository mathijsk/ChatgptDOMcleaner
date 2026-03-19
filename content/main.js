console.log("ChatGPT DOM Cleaner v1.7 loaded")

const defaults = {
    visibleMessages: 200,
    trimTrigger: 260,
    aggressiveKeep: 120,
    softLimit: 60000,
    hardLimit: 90000,
    codeCollapseAfter: 10,
    collapseTextAfterLines: 20,
    restoreChunkSize: 10
}

const browserApi = typeof browser !== "undefined" ? browser : chrome;

// ================= STORAGE =================

function storageGet(keys) {
    return new Promise(resolve => {
        browserApi.storage.local.get(keys, result => resolve(result))
    })
}

function storageSet(data) {
    return new Promise(resolve => {
        browserApi.storage.local.set(data, () => resolve())
    })
}

// ================= STATE =================

let settings = { ...defaults }

let turnRegistry = []
let hiddenTurns = []
let pinnedTurns = new WeakSet()

let observerTimer = null
let scrollTimer = null

let statsText = null

// ================= SETTINGS =================

async function loadSettings() {
    const stored = await storageGet(defaults)
    settings = { ...defaults, ...stored }
}

// ================= UTIL =================

function countLines(text) {
    return text.split("\n").length
}

function getTurnRole(turn) {
    return turn.getAttribute("data-message-author-role")
}

// ================= GET TURNS =================

function getAllTurns() {
    return [...document.querySelectorAll('[data-message-author-role]')]
}

// ================= CLEAN REGISTRY =================

function cleanRegistry() {
    turnRegistry = turnRegistry.filter(turn => document.body.contains(turn))
}

// ================= CODE COLLAPSE =================

function collapseCodeBlocks(turn, index, total) {

    const distance = total - index

    if (distance <= settings.codeCollapseAfter) return

    const blocks = turn.querySelectorAll("pre")

    blocks.forEach(block => {

        if (block.dataset.domcleanerCollapsed) return

        const applyCollapse = () => {

            if (!document.body.contains(block)) return
            if (block.dataset.domcleanerCollapsed) return

            block.dataset.domcleanerCollapsed = "true"

            const wrapper = document.createElement("div")
            wrapper.style.border = "1px solid #4caf50"
            wrapper.style.background = "rgba(76, 175, 80, 0.08)"
            wrapper.style.borderRadius = "12px"
            wrapper.style.padding = "6px"
            wrapper.style.margin = "6px 0"
            wrapper.style.transition = "all 0.15s ease"

            wrapper.onmouseenter = () => {
                wrapper.style.background = "rgba(76, 175, 80, 0.12)"
            }
            wrapper.onmouseleave = () => {
                wrapper.style.background = "rgba(76, 175, 80, 0.08)"
            }

            const btn = document.createElement("button")
            btn.textContent = "Expand collapsed code block"
            btn.style.fontSize = "14px"
            btn.style.background = "none"
            btn.style.border = "none"
            btn.style.cursor = "pointer"
            btn.style.padding = "0"
            btn.style.color = "#4caf50"

            btn.onclick = () => wrapper.replaceWith(block)

            wrapper.appendChild(btn)
            block.replaceWith(wrapper)
        }

        // ONLY delay for newest messages (hydration zone)
        if (distance < 20) {
            requestAnimationFrame(() => applyCollapse())
        } else {
            applyCollapse()
        }

    })
}

// ================= USER TEXT COLLAPSE =================

function collapseLargeUserText(turn) {

    if (getTurnRole(turn) !== "user") return

    const container = turn.querySelector(".user-message-bubble-color")
    if (!container) return

    const textNode = container.querySelector('[class*="whitespace-pre"]')
    if (!textNode) return

    const lines = countLines(textNode.textContent)

    if (lines < settings.collapseTextAfterLines) return
    if (container.dataset.domcleanerCollapsed) return

    container.dataset.domcleanerCollapsed = "true"

    const wrapper = document.createElement("div")
    wrapper.style.border = "1px solid #2196f3"
    wrapper.style.background = "rgba(33, 150, 243, 0.08)"
    wrapper.style.borderRadius = "12px"
    wrapper.style.padding = "6px"
    wrapper.style.margin = "6px 0"
    wrapper.style.maxWidth = "100%"
    wrapper.style.transition = "all 0.15s ease"

    wrapper.onmouseenter = () => {
        wrapper.style.background = "rgba(33, 150, 243, 0.12)"
    }
    wrapper.onmouseleave = () => {
        wrapper.style.background = "rgba(33, 150, 243, 0.08)"
    }

    const btn = document.createElement("button")
    btn.textContent = `Expand long message (${lines} lines)`
    btn.style.fontSize = "14px"
    btn.style.background = "none"
    btn.style.border = "none"
    btn.style.cursor = "pointer"
    btn.style.padding = "0"
    btn.style.color = "#2196f3"

    btn.onclick = () => wrapper.replaceWith(container)

    wrapper.appendChild(btn)

    container.replaceWith(wrapper)
}

// ================= PROCESS =================

function processTurn(turn) {

    const len = turn.textContent.length

    // ignore tiny / loading states
    if (len < 50) return

    const container = turn.querySelector(".user-message-bubble-color")
    if (!container) return

    const textNode = container.querySelector('[class*="whitespace-pre"]')
    if (!textNode) return

    const lines = countLines(textNode.textContent)

    // not large enough → never collapse
    if (lines < settings.collapseTextAfterLines) return

    // already collapsed → nothing to do
    if (container.dataset.domcleanerCollapsed) return

    // delay one frame to let DOM settle
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {

            // still valid & not already collapsed?
            if (!document.body.contains(container)) return
            if (container.dataset.domcleanerCollapsed) return

            collapseLargeUserText(turn)

        })
    })
}

// ================= RECHECK CODE =================

function reevaluateCodeCollapse() {

    const total = turnRegistry.length

    turnRegistry.forEach((turn, i) => {
        collapseCodeBlocks(turn, i, total)
    })
}

// ================= INITIAL SCAN =================

function initialScan() {

    getAllTurns().forEach(turn => {

        if (!turnRegistry.includes(turn)) {
            turnRegistry.push(turn)
        }

        processTurn(turn)
    })

    reevaluateCodeCollapse()
}

// ================= TRIM =================

function trimTurns() {

    if (turnRegistry.length <= settings.trimTrigger) return

    let removed = 0

    for (const turn of turnRegistry) {

        if (pinnedTurns.has(turn)) continue

        if (turnRegistry.length - removed <= settings.visibleMessages) break

        hiddenTurns.push(turn)

        const placeholder = document.createElement("div")
        placeholder.style.opacity = ".6"
        placeholder.style.fontSize = "12px"
        placeholder.style.padding = "6px"
        placeholder.style.borderLeft = "3px solid #888"
        placeholder.textContent = "Message hidden by ChatGPT DOM Cleaner"

        turn.replaceWith(placeholder)

        removed++
    }
}

// ================= RESTORE =================

function restoreTurns() {

    if (window.scrollY > 200) return

    const container = detectConversationContainer()
    if (!container) return

    const chunk = settings.restoreChunkSize || 10

    for (let i = 0; i < chunk; i++) {

        if (!hiddenTurns.length) break

        const turn = hiddenTurns.pop()
        container.prepend(turn)
    }
}

// ================= DOM SAFETY =================

function domSafetyCheck() {

    const nodes = document.getElementsByTagName("*").length

    if (nodes > settings.hardLimit) {

        console.warn("DOM Cleaner HARD LIMIT", nodes)

        let removed = 0

        for (const turn of turnRegistry) {

            if (pinnedTurns.has(turn)) continue

            if (turnRegistry.length - removed <= settings.aggressiveKeep) break

            turn.remove()
            removed++
        }

    } else if (nodes > settings.softLimit) {

        trimTurns()
    }
}

// ================= PINNING =================

function enablePinning() {

    document.addEventListener("dblclick", e => {

        const turn = e.target.closest('[data-message-author-role]')
        if (!turn) return

        pinnedTurns.add(turn)
        turn.style.outline = "2px solid #4caf50"
    })
}

// ================= PANEL =================

function createPanel() {

    const panel = document.createElement("div")

    panel.style.position = "fixed"
    panel.style.bottom = "10px"
    panel.style.right = "10px"
    panel.style.background = "rgba(0,0,0,.75)"
    panel.style.color = "white"
    panel.style.padding = "8px"
    panel.style.borderRadius = "6px"
    panel.style.fontSize = "11px"
    panel.style.zIndex = "9999"

    const cleanBtn = document.createElement("button")
    cleanBtn.textContent = "Clean DOM"
    cleanBtn.style.display = "block"
    cleanBtn.onclick = trimTurns

    panel.appendChild(cleanBtn)

    statsText = document.createElement("div")
    panel.appendChild(statsText)

    document.body.appendChild(panel)
}

function updateStats() {

    if (!statsText) return

    const nodes = document.getElementsByTagName("*").length

    statsText.textContent = `Turns:${turnRegistry.length} DOM:${nodes}`
}

// ================= CONTAINER =================

function detectConversationContainer() {

    const msg = document.querySelector('[data-message-author-role]')
    if (!msg) return null

    return msg.closest('[data-testid]')?.parentElement || msg.parentElement
}

// ================= OBSERVER =================

function startObserver() {

    const observer = new MutationObserver(() => {

        if (observerTimer) return

        observerTimer = setTimeout(() => {

            cleanRegistry()

            const turns = getAllTurns()

            turns.forEach(turn => {

                if (!turnRegistry.includes(turn)) {
                    turnRegistry.push(turn)
                }

                processTurn(turn)
            })

            reevaluateCodeCollapse()

            observerTimer = null

        }, 150)

    })

    observer.observe(document.body, {
        childList: true,
        subtree: true
    })
}

// ================= SCROLL =================

function startScrollHandler() {

    window.addEventListener("scroll", () => {

        if (scrollTimer) return

        scrollTimer = setTimeout(() => {

            restoreTurns()
            reevaluateCodeCollapse()

            scrollTimer = null

        }, 150)

    })
}

// ================= WAIT =================

function waitForConversation() {

    return new Promise(resolve => {

        const interval = setInterval(() => {

            if (document.querySelector('[data-message-author-role]')) {
                clearInterval(interval)
                resolve()
            }

        }, 200)

    })
}

// ================= INIT =================

async function init() {

    await loadSettings()

    createPanel()
    enablePinning()

    await waitForConversation()

    initialScan()
    startObserver()
    startScrollHandler()

    setInterval(domSafetyCheck, 10000)
    setInterval(updateStats, 10000)
}

init()