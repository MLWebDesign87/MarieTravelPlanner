#!/usr/bin/env bash
# ==========================================================================
# Marie Dream Planner — Téléchargement et optimisation des médias
# --------------------------------------------------------------------------
# Récupère les photos et la vidéo libres de droits du site, puis les convertit
# aux formats web (WebP + JPEG de secours, MP4 H.264 + WebM VP9, image d'attente).
# Les fichiers produits remplacent les visuels de remplacement de assets/media/.
#
# Prérequis : bash, curl, ffmpeg (avec libx264, libvpx-vp9 et libwebp).
#
# Utilisation :
#   ./scripts/fetch-media.sh                    téléchargement automatique
#   ./scripts/fetch-media.sh --from-dir ~/dl    fichiers déjà téléchargés à la main,
#                                               nommés weekend.jpg, escapade.jpg,
#                                               evasion.jpg et hero.mp4
#
# Licences (vérifiées le 23/10/2026) :
#   - Week-end : Jorgen Hendriksen, Unsplash License
#     https://unsplash.com/photos/canal-lined-with-trees-and-boats-in-amsterdam-N-tEwjkznfc
#   - Escapade : Dylan Freedom, Unsplash License
#     https://unsplash.com/photos/calm-body-of-water-beside-concrete-bridge-iEgP_YHs-jM
#   - Évasion  : Pexels License (photo n° 1167021, Bora Bora)
#     https://www.pexels.com/photo/1167021/
#   - Vidéo    : « Bright orange sunset on beach », asadphoto, Mixkit Stock Video Free License
#     https://mixkit.co/free-stock-video/bright-orange-sunset-on-beach-2168/
# ==========================================================================

set -euo pipefail

readonly projectRoot="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly mediaDir="${projectRoot}/assets/media"
readonly workDir="$(mktemp -d)"
trap 'rm -rf "${workDir}"' EXIT

# Sources : une ou plusieurs URL candidates par média (essayées dans l'ordre)
declare -A photoSources=(
  [weekend]="https://images.unsplash.com/photo-1765217993856-6e323db338f0?fm=jpg&q=85&w=2000&fit=crop"
  [escapade]="https://images.unsplash.com/photo-1526604648377-1433c7c1f5b7?fm=jpg&q=85&w=2000&fit=crop"
  [evasion]="https://images.pexels.com/photos/1167021/pexels-photo-1167021.jpeg?auto=compress&cs=tinysrgb&w=2000"
)
readonly videoSources=(
  "https://assets.mixkit.co/videos/2168/2168-1080.mp4"
  "https://assets.mixkit.co/videos/2168/2168-720.mp4"
)
readonly videoPage="https://mixkit.co/free-stock-video/bright-orange-sunset-on-beach-2168/"

# Seconde de la vidéo utilisée pour l'image d'attente (poster)
readonly posterTimestamp="3"

sourceDir=""

# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------
logInfo()  { printf '\033[1;35m›\033[0m %s\n' "$*"; }
logOk()    { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
logError() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }

requireCommand() {
  if ! command -v "$1" >/dev/null 2>&1; then
    logError "Commande introuvable : $1 (à installer avant de relancer)."
    exit 1
  fi
}

# Télécharge la première URL qui répond, vers le fichier cible.
# $1 : fichier cible, $2… : URL candidates
downloadFirstAvailable() {
  local targetFile="$1"; shift
  local candidateUrl
  for candidateUrl in "$@"; do
    if curl --fail --location --silent --show-error --retry 2 \
         --user-agent "Mozilla/5.0 (media fetch for mariedreamplanner.fr)" \
         --output "${targetFile}" "${candidateUrl}"; then
      return 0
    fi
  done
  return 1
}

# --------------------------------------------------------------------------
# Conversion des photos : 640 / 960 / 1280 px en WebP, 960 px en JPEG (ratio 4:3)
# --------------------------------------------------------------------------
encodePhoto() {
  local photoKey="$1" sourceFile="$2" targetWidth targetHeight
  for targetWidth in 640 960 1280; do
    targetHeight=$(( targetWidth * 3 / 4 ))
    # Remplit le cadre 4:3 puis recadre au centre, quel que soit le format d'origine
    ffmpeg -loglevel error -y -i "${sourceFile}" \
      -vf "scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}" \
      -c:v libwebp -quality 74 -compression_level 6 \
      "${mediaDir}/formula-${photoKey}-${targetWidth}.webp"
  done
  ffmpeg -loglevel error -y -i "${sourceFile}" \
    -vf "scale=960:720:force_original_aspect_ratio=increase,crop=960:720" \
    -q:v 4 "${mediaDir}/formula-${photoKey}-960.jpg"
  logOk "Photo « ${photoKey} » optimisée."
}

# --------------------------------------------------------------------------
# Conversion de la vidéo : 720p, sans piste audio, boucle de 14 s
# --------------------------------------------------------------------------
encodeVideo() {
  local sourceFile="$1"

  # MP4 H.264 : compatibilité universelle, « faststart » pour démarrer avant la fin du téléchargement
  ffmpeg -loglevel error -y -i "${sourceFile}" -an \
    -vf "scale=-2:720,fps=24" -c:v libx264 -preset slow -crf 27 \
    -profile:v high -pix_fmt yuv420p -movflags +faststart \
    "${mediaDir}/hero.mp4"

  # WebM VP9 : plus léger, servi en priorité aux navigateurs compatibles
  ffmpeg -loglevel error -y -i "${sourceFile}" -an \
    -vf "scale=-2:720,fps=24" -c:v libvpx-vp9 -crf 38 -b:v 0 \
    -row-mt 1 -deadline good -cpu-used 2 \
    "${mediaDir}/hero.webm"

  # Image d'attente carrée (la vidéo s'affiche dans un disque), en 3 tailles responsives
  local posterSize
  for posterSize in 640 960 1280; do
    ffmpeg -loglevel error -y -ss "${posterTimestamp}" -i "${sourceFile}" -frames:v 1 \
      -vf "crop=ih:ih,scale=${posterSize}:${posterSize}" -c:v libwebp -quality 72 \
      "${mediaDir}/hero-poster-${posterSize}.webp"
  done
  ffmpeg -loglevel error -y -ss "${posterTimestamp}" -i "${sourceFile}" -frames:v 1 \
    -vf "crop=ih:ih,scale=960:960" -q:v 4 \
    "${mediaDir}/hero-poster-960.jpg"

  logOk "Vidéo optimisée : $(du -h "${mediaDir}/hero.mp4" | cut -f1) (MP4), $(du -h "${mediaDir}/hero.webm" | cut -f1) (WebM)."
}

# --------------------------------------------------------------------------
# Programme principal
# --------------------------------------------------------------------------
main() {
  if [[ "${1:-}" == "--from-dir" ]]; then
    sourceDir="${2:?Indiquez le dossier contenant weekend.jpg, escapade.jpg, evasion.jpg et hero.mp4}"
  fi

  requireCommand ffmpeg
  [[ -z "${sourceDir}" ]] && requireCommand curl
  mkdir -p "${mediaDir}"

  local photoKey sourceFile hasError=0

  for photoKey in weekend escapade evasion; do
    sourceFile="${workDir}/${photoKey}.jpg"
    if [[ -n "${sourceDir}" ]]; then
      cp "${sourceDir}/${photoKey}.jpg" "${sourceFile}"
    else
      logInfo "Téléchargement de la photo « ${photoKey} »…"
      if ! downloadFirstAvailable "${sourceFile}" "${photoSources[${photoKey}]}"; then
        logError "Échec du téléchargement de « ${photoKey} ». Téléchargez-la depuis la page indiquée en tête de script, puis relancez avec --from-dir."
        hasError=1; continue
      fi
    fi
    encodePhoto "${photoKey}" "${sourceFile}"
  done

  sourceFile="${workDir}/hero.mp4"
  if [[ -n "${sourceDir}" ]]; then
    cp "${sourceDir}/hero.mp4" "${sourceFile}"
  else
    logInfo "Téléchargement de la vidéo…"
    if ! downloadFirstAvailable "${sourceFile}" "${videoSources[@]}"; then
      logError "Échec du téléchargement de la vidéo. Téléchargez-la (bouton « Download Free », 1080p) depuis ${videoPage}, renommez-la hero.mp4, puis relancez avec --from-dir."
      exit 1
    fi
  fi
  encodeVideo "${sourceFile}"

  if (( hasError )); then
    logError "Terminé avec des erreurs : voir ci-dessus."
    exit 1
  fi
  logOk "Tous les médias sont prêts dans assets/media/."
}

main "$@"
