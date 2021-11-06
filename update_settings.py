import json
import re
import os


def parse_settings():
    if os.path.exists('settings.json'):
        try:
            with open('settings.json', 'r') as f:
                emoji_settings = json.load(f)
        except json.JSONDecodeError:
            emoji_settings = dict()
    else:
        emoji_settings = dict()

    return emoji_settings


def parse_emojis_txt():
    with open('emojis.txt', 'r') as f:
        emojis = re.findall(r"<:[^:]{2,}:[0-9]+>", f.read(), re.IGNORECASE)

    return emojis


def update_settings():
    emoji_settings = parse_settings()
    new_emojis = parse_emojis_txt()

    for emoji in new_emojis:
        if emoji not in emoji_settings:
            name = re.match(r"<:([^:]{2,}):[0-9]+>", emoji).group(1)
            emoji_settings[emoji] = [name]

    with open('settings.json', 'w') as f:
        json.dump(emoji_settings, f, indent=4)


if __name__ == '__main__':
    update_settings()
