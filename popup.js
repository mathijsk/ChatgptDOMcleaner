const defaults = {
visibleMessages:200,
trimTrigger:260,
aggressiveKeep:120,
softLimit:60000,
hardLimit:90000,
codeCollapseAfter:10,
collapseTextAfterLines:20
}

// Cross-browser API
const browserApi = typeof browser !== "undefined" ? browser : chrome;

// Storage wrappers (works in Firefox + Chrome + Edge + Opera)
function storageGet(keys){
return new Promise(resolve=>{
browserApi.storage.local.get(keys,(result)=>{
resolve(result)
})
})
}

function storageSet(data){
return new Promise(resolve=>{
browserApi.storage.local.set(data,()=>{
resolve()
})
})
}

async function loadSettings(){

const settings = await storageGet(defaults)

for(const key in settings){

const el=document.getElementById(key)

if(el){
el.value=settings[key]
}

}

}

async function saveSettings(){

const data={

collapseTextAfterLines:Number(
document.getElementById("collapseTextAfterLines").value
),

codeCollapseAfter:Number(
document.getElementById("codeCollapseAfter").value
),

visibleMessages:Number(
document.getElementById("visibleMessages").value
),

trimTrigger:Number(
document.getElementById("trimTrigger").value
),

aggressiveKeep:Number(
document.getElementById("aggressiveKeep").value
),

softLimit:Number(
document.getElementById("softLimit").value
),

hardLimit:Number(
document.getElementById("hardLimit").value

)

}

await storageSet(data)

}

// Wait until popup DOM is ready
document.addEventListener("DOMContentLoaded",()=>{

document
.getElementById("save")
.addEventListener("click",saveSettings)

loadSettings()

})
