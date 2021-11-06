const discordEmojiRegex = new RegExp("<:([^:]{2,}):([0-9]+)>", 'i');


$(document).ready(function() {
    let textInput = document.getElementById('input');
    let pOutput = document.getElementById('output');

    $('#input').on('input propertychange paste', function() {
        let input = textInput.value;

        // replace input text: '->' to '→'
        input = input.replace('->', '→');

        // replace input text: '<:Cinderbanes:513190158355660812>' to 'Cinderbanes'
        let match = discordEmojiRegex.exec(input);
        while (match != null) {
            input = input.replace(match[0], match[1]);
            match = discordEmojiRegex.exec(input);
        }

        // set output field: 'Cinderbanes' to '<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/643505179378974748.png?v=1">'
        let output = input;
        for (const emoji of emojiLUT) {
            if (output.toLowerCase().includes(emoji[0])) {
                output = output.replace(new RegExp(emoji[0], "ig"), '<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png?v=1">');
            }
        }

        // update input and output text
        textInput.value = input;
        pOutput.innerHTML = output;
    });
});
