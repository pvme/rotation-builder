import json


def get_emoji_lut():
    with open('settings.json', 'r') as f:
        settings = json.load(f)

    emoji_lut = list()
    for emoji, aliases in settings.items():
        for alias in aliases:
            emoji_lut.append([alias.lower(), emoji])

    return sorted(emoji_lut, key=lambda x: len(x[0]), reverse=True)


def update_emoji_lut():
    emoji_lut = get_emoji_lut()
    with open('site/js/emojiLUT.js', 'w') as f:
        f.write(f"const emojiLUT={emoji_lut};")


if __name__ == '__main__':
    update_emoji_lut()
