const REPO = 'retroverse-studios/karaoke-stage'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`
const FALLBACK_URL = `https://github.com/${REPO}/releases/latest`
const PLATFORM_LABEL = { mac: 'macOS', windows: 'Windows', linux: 'Linux' }

// ---------- platform-aware download ----------

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) return 'mac'
  if (platform.includes('win') || ua.includes('windows')) return 'windows'
  if (ua.includes('linux') || platform.includes('linux')) return 'linux'
  return 'mac'
}

let selectedPlatform = detectPlatform()
let release = null // { tag, assets[] }
let releaseChecked = false

async function loadRelease() {
  try {
    const res = await fetch(RELEASES_API)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    release = { tag: data.tag_name, assets: data.assets || [] }
  } catch {
    release = null // rate-limited or no release yet
  }
  releaseChecked = true
  render()
}

// Tauri asset conventions: .dmg (mac, aarch64/x64), -setup.exe / .msi (win), .AppImage / .deb (linux)
function assetsFor(platform) {
  if (!release) return { primary: null, alt: null }
  const find = (test) => release.assets.find((a) => test(a.name.toLowerCase())) || null
  if (platform === 'mac') {
    const arm = find((n) => n.includes('aarch64') && n.endsWith('.dmg'))
    const intel = find((n) => !n.includes('aarch64') && n.endsWith('.dmg'))
    return { primary: arm || intel, alt: arm ? intel : null }
  }
  if (platform === 'windows') {
    return { primary: find((n) => n.endsWith('.exe')) || find((n) => n.endsWith('.msi')), alt: null }
  }
  return { primary: find((n) => n.endsWith('.appimage')) || find((n) => n.endsWith('.deb')), alt: null }
}

function render() {
  const { primary, alt } = assetsFor(selectedPlatform)
  const label = PLATFORM_LABEL[selectedPlatform]
  const heroBtn = document.getElementById('download-btn')
  const runBtn = document.getElementById('download-btn-2')
  const version = document.getElementById('version')
  const altLink = document.getElementById('alt-arch')
  const others = document.getElementById('other-platforms')

  const noReleaseYet = releaseChecked && !release

  for (const btn of [heroBtn, runBtn]) {
    if (!btn) continue
    if (noReleaseYet) {
      btn.textContent = btn === heroBtn ? 'Desktop app — coming soon' : 'Coming soon'
      btn.href = FALLBACK_URL
    } else {
      btn.textContent = `Download for ${label}`
      btn.href = primary ? primary.browser_download_url : FALLBACK_URL
    }
  }

  version.textContent = release ? `${release.tag} · ${label}` : ' '

  if (selectedPlatform === 'mac' && alt) {
    altLink.hidden = false
    altLink.textContent = 'Intel Mac? Download x64 →'
    altLink.href = alt.browser_download_url
  } else {
    altLink.hidden = true
  }

  if (others) {
    const rest = Object.keys(PLATFORM_LABEL).filter((p) => p !== selectedPlatform)
    others.innerHTML = noReleaseYet
      ? ''
      : 'Also for ' + rest
          .map((p) => {
            const a = assetsFor(p).primary
            const href = a ? a.browser_download_url : FALLBACK_URL
            return `<a href="${href}">${PLATFORM_LABEL[p]}</a>`
          })
          .join(' · ')
  }

  document.querySelectorAll('.platform-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.platform === selectedPlatform)
  })
}

document.querySelectorAll('.platform-btn').forEach((b) => {
  b.addEventListener('click', () => {
    selectedPlatform = b.dataset.platform
    render()
  })
})

render()
loadRelease()

// ---------- screenshot carousel ----------

const SHOTS = [
  { src: 'assets/shot-library.png', caption: 'Your library, neon party mode' },
  { src: 'assets/shot-stage.png', caption: 'LRC lyrics with live pitch scoring' },
  { src: 'assets/shot-christmas.png', caption: 'Themes restyle the whole app' },
  { src: 'assets/shot-upload.png', caption: 'Import single songs or whole folders' },
]

const carousel = document.getElementById('carousel')
const dots = document.getElementById('carousel-dots')
const caption = document.getElementById('carousel-caption')
let current = 0
let timer = null

SHOTS.forEach((shot, i) => {
  const img = document.createElement('img')
  img.src = shot.src
  img.alt = shot.caption
  img.loading = i === 0 ? 'eager' : 'lazy'
  if (i > 0) img.style.display = 'none'
  carousel.appendChild(img)

  const dot = document.createElement('button')
  dot.setAttribute('aria-label', `Screenshot ${i + 1}: ${shot.caption}`)
  dot.addEventListener('click', () => { show(i); restart() })
  dots.appendChild(dot)
})

function show(i) {
  current = i
  carousel.querySelectorAll('img').forEach((img, j) => {
    img.style.display = j === i ? 'block' : 'none'
    img.classList.toggle('visible', j === i)
  })
  dots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('active', j === i))
  caption.textContent = SHOTS[i].caption
}

function restart() {
  clearInterval(timer)
  timer = setInterval(() => show((current + 1) % SHOTS.length), 4500)
}

carousel.addEventListener('mouseenter', () => clearInterval(timer))
carousel.addEventListener('mouseleave', restart)

show(0)
restart()
