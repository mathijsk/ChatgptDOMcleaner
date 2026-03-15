console.log("ChatGPT DOM Cleaner v1.3 loaded")

const defaults={
visibleMessages:200,
trimTrigger:260,
aggressiveKeep:120,
softLimit:60000,
hardLimit:90000,
codeCollapseAfter:10,
collapseTextAfterLines:20,
restoreChunkSize:10
}

let settings={...defaults}

let turnRegistry=[]
let hiddenTurns=[]
let processedTurns=new WeakSet()
let pinnedTurns=new WeakSet()

let observerTimer=null
let scrollTimer=null

let statsText=null

// ---------------- SETTINGS ----------------

async function loadSettings(){
const stored=await browser.storage.local.get(defaults)
settings={...defaults,...stored}
}

// ---------------- UTIL ----------------

function countLines(text){
return text.split("\n").length
}

function getTurnRole(turn){
const node=turn.querySelector("[data-message-author-role]")
return node?.getAttribute("data-message-author-role")
}

// ---------------- CODE COLLAPSE ----------------

function collapseCodeBlocks(turn,index,total){

const distance=total-index

if(distance<=settings.codeCollapseAfter)
return

const blocks=turn.querySelectorAll("pre")

blocks.forEach(block=>{

if(block.dataset.domcleanerCollapsed)
return

block.dataset.domcleanerCollapsed="true"

const wrapper=document.createElement("div")

wrapper.style.border="1px solid #666"
wrapper.style.padding="6px"
wrapper.style.margin="6px 0"

const btn=document.createElement("button")
btn.textContent="Expand collapsed code block"
btn.style.fontSize="11px"

btn.onclick=()=>wrapper.replaceWith(block)

wrapper.appendChild(btn)

block.replaceWith(wrapper)

})

}

// ---------------- USER TEXT COLLAPSE ----------------

function collapseLargeUserText(turn){

if(getTurnRole(turn)!=="user")
return

const container=turn.querySelector("[data-message-author-role]")

if(!container) return

const lines=countLines(container.textContent)

if(lines<settings.collapseTextAfterLines)
return

if(container.dataset.domcleanerCollapsed)
return

container.dataset.domcleanerCollapsed="true"

const wrapper=document.createElement("div")

wrapper.style.border="1px solid #666"
wrapper.style.padding="6px"
wrapper.style.margin="6px 0"

const btn=document.createElement("button")

btn.textContent=`Expand long message (${lines} lines)`
btn.style.fontSize="11px"

btn.onclick=()=>wrapper.replaceWith(container)

wrapper.appendChild(btn)

container.replaceWith(wrapper)

}

// ---------------- PROCESS TURN ----------------

function processTurn(turn){

if(processedTurns.has(turn))
return

processedTurns.add(turn)

collapseLargeUserText(turn)

}

// ---------------- RECHECK CODE COLLAPSE ----------------

function reevaluateCodeCollapse(){

const total=turnRegistry.length

turnRegistry.forEach((turn,i)=>{
collapseCodeBlocks(turn,i,total)
})

}

// ---------------- INITIAL SCAN ----------------

function initialScan(){

document
.querySelectorAll('article[data-testid^="conversation-turn"]')
.forEach(turn=>{

if(!turnRegistry.includes(turn))
turnRegistry.push(turn)

processTurn(turn)

})

reevaluateCodeCollapse()

}

// ---------------- TRIM ----------------

function trimTurns(){

if(turnRegistry.length<=settings.trimTrigger)
return

let removed=0

for(const turn of turnRegistry){

if(pinnedTurns.has(turn))
continue

if(turnRegistry.length-removed<=settings.visibleMessages)
break

hiddenTurns.push(turn)

const placeholder=document.createElement("div")

placeholder.style.opacity=".6"
placeholder.style.fontSize="12px"
placeholder.style.padding="6px"
placeholder.style.borderLeft="3px solid #888"

placeholder.textContent="Message hidden by ChatGPT DOM Cleaner"

turn.replaceWith(placeholder)

removed++

}

}

// ---------------- RESTORE ----------------

function restoreTurns(){

if(window.scrollY>200)
return

const container=detectConversationContainer()

if(!container) return

const chunk=settings.restoreChunkSize||10

for(let i=0;i<chunk;i++){

if(!hiddenTurns.length)
break

const turn=hiddenTurns.pop()

container.prepend(turn)

}

}

// ---------------- DOM SAFETY ----------------

function domSafetyCheck(){

const nodes=document.getElementsByTagName("*").length

if(nodes>settings.hardLimit){

console.warn("DOM Cleaner HARD LIMIT",nodes)

let removed=0

for(const turn of turnRegistry){

if(pinnedTurns.has(turn))
continue

if(turnRegistry.length-removed<=settings.aggressiveKeep)
break

turn.remove()

removed++

}

}
else if(nodes>settings.softLimit){

trimTurns()

}

}

// ---------------- PINNING ----------------

function enablePinning(){

document.addEventListener("dblclick",e=>{

const turn=e.target.closest('article[data-testid^="conversation-turn"]')

if(!turn) return

pinnedTurns.add(turn)

turn.style.outline="2px solid #4caf50"

})

}

// ---------------- PANEL ----------------

function createPanel(){

const panel=document.createElement("div")

panel.style.position="fixed"
panel.style.bottom="10px"
panel.style.right="10px"
panel.style.background="rgba(0,0,0,.75)"
panel.style.color="white"
panel.style.padding="8px"
panel.style.borderRadius="6px"
panel.style.fontSize="11px"
panel.style.zIndex="9999"

const cleanBtn=document.createElement("button")

cleanBtn.textContent="Clean DOM"
cleanBtn.style.display="block"
cleanBtn.onclick=trimTurns

panel.appendChild(cleanBtn)

statsText=document.createElement("div")
panel.appendChild(statsText)

document.body.appendChild(panel)

}

function updateStats(){

if(!statsText) return

const nodes=document.getElementsByTagName("*").length

statsText.textContent=`Turns:${turnRegistry.length} DOM:${nodes}`

}

// ---------------- CONTAINER DETECTION ----------------

function detectConversationContainer(){

const firstTurn=document.querySelector('article[data-testid^="conversation-turn"]')

if(!firstTurn) return null

return firstTurn.parentElement

}

// ---------------- OBSERVER ----------------

function startObserver(){

const container=detectConversationContainer()

if(!container) return

const observer=new MutationObserver(mutations=>{

if(observerTimer) return

observerTimer=setTimeout(()=>{

mutations.forEach(m=>{

m.addedNodes.forEach(node=>{

if(node.nodeType!==1) return

if(node.matches?.('article[data-testid^="conversation-turn"]')){

if(!turnRegistry.includes(node))
turnRegistry.push(node)

processTurn(node)
reevaluateCodeCollapse()

}

})

})

observerTimer=null

},200)

})

observer.observe(container,{childList:true})

}

// ---------------- SCROLL ----------------

function startScrollHandler(){

window.addEventListener("scroll",()=>{

if(scrollTimer) return

scrollTimer=setTimeout(()=>{

restoreTurns()
reevaluateCodeCollapse()

scrollTimer=null

},150)

})

}

// ---------------- WAIT FOR CHAT ----------------

function waitForConversation(){

return new Promise(resolve=>{

const interval=setInterval(()=>{

if(document.querySelector('article[data-testid^="conversation-turn"]')){

clearInterval(interval)
resolve()

}

},200)

})

}

// ---------------- INIT ----------------

async function init(){

await loadSettings()

createPanel()
enablePinning()

await waitForConversation()

initialScan()
startObserver()
startScrollHandler()

setInterval(domSafetyCheck,10000)
setInterval(updateStats,10000)

}

init()
