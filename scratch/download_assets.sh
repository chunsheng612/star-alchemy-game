#!/bin/bash
mkdir -p assets/familiars assets/bg

BASE_URL="https://image.pollinations.ai/prompt/"

download_asset() {
    FILE=$1
    PROMPT=$2
    # Check if file exists and is not empty
    if [ -s "$FILE" ]; then
        echo "$FILE already exists and is not empty, skipping."
        return
    fi
    echo "Downloading $FILE..."
    curl -L -f -o "$FILE" "${BASE_URL}${PROMPT// /%20}?nologo=true"
    sleep 3 # Wait 3 seconds between requests
}

# 21 Pets
download_asset "assets/familiars/owl.png" "cute magical owl with glowing eyes, game asset, white background, high quality, digital art"
download_asset "assets/familiars/dragon.png" "cute baby dragon, starry wings, game asset, white background, high quality, digital art"
download_asset "assets/familiars/book.png" "magical flying book with golden glow, game asset, white background, high quality, digital art"
download_asset "assets/familiars/slime.png" "cute blue starry slime, game asset, white background, high quality, digital art"
download_asset "assets/familiars/fox.png" "magical fire fox with glowing tails, game asset, white background, high quality, digital art"
download_asset "assets/familiars/ldragon.png" "cute green forest dragon with leaf crown, game asset, white background, high quality, digital art"
download_asset "assets/familiars/mowl.png" "silver moonlight owl, game asset, white background, high quality, digital art"
download_asset "assets/familiars/sprite.png" "tiny golden sun spirit, game asset, white background, high quality, digital art"
download_asset "assets/familiars/jellyfish.png" "glowing blue sea jellyfish, game asset, white background, high quality, digital art"
download_asset "assets/familiars/turtle.png" "crystal turtle with glowing shell, game asset, white background, high quality, digital art"
download_asset "assets/familiars/cat.png" "shadow cat with glowing eyes, game asset, white background, high quality, digital art"
download_asset "assets/familiars/bird.png" "mechanical bird with gears, game asset, white background, high quality, digital art"
download_asset "assets/familiars/sheep.png" "fluffy cloud sheep, game asset, white background, high quality, digital art"
download_asset "assets/familiars/p_owl.png" "dark phantom owl, game asset, white background, high quality, digital art"
download_asset "assets/familiars/f_dragon.png" "red lava dragon, game asset, white background, high quality, digital art"
download_asset "assets/familiars/g_book.png" "green emerald magic book, game asset, white background, high quality, digital art"
download_asset "assets/familiars/b_cat.png" "blue water shadow cat, game asset, white background, high quality, digital art"
download_asset "assets/familiars/r_slime.png" "pink strawberry slime, game asset, white background, high quality, digital art"
download_asset "assets/familiars/v_sprite.png" "purple amethyst spirit, game asset, white background, high quality, digital art"
download_asset "assets/familiars/o_turtle.png" "orange lava turtle, game asset, white background, high quality, digital art"
download_asset "assets/familiars/w_sheep.png" "purple mystical cloud sheep, game asset, white background, high quality, digital art"

# Backgrounds
download_asset "assets/bg/bg_library.png" "magical ancient library, dark purple lighting, floating books, game background, high quality, digital art"
download_asset "assets/bg/bg_observatory.png" "celestial observatory with telescope, starry sky background, deep blue lighting, game background, high quality, digital art"

echo "Batch download complete."
