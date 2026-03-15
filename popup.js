const defaults = {
visibleMessages:200,
trimTrigger:260,
aggressiveKeep:120,
softLimit:60000,
hardLimit:90000,
codeCollapseAfter:10,
collapseTextAfterLines:20
}

async function loadSettings(){

const settings =
await browser.storage.local.get(defaults)

for(const key in settings){

const el=document.getElementById(key)

if(el)
el.value=settings[key]

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

await browser.storage.local.set(data)

}

document.getElementById("save")
.addEventListener("click",saveSettings)

loadSettings()