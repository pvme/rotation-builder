const discordEmojiRegex = new RegExp("<:([^:]{2,}):([0-9]+)>", 'i');

function reverse(str) {
    let reversed = "";
    for (let i = str.length - 1; i >= 0; i--) {
        reversed += str[i];
    }
    return reversed;
}


$(document).ready(function() {
    let textInput = document.getElementById('input');
    let pOutput = document.getElementById('output');

//    $("#input").asuggest(emojiSuggestions, {
//        'autoComplete': false,
//        'cycleOnTab': true,
//        'ignoreCase': true,
//        'endingSymbols': '',
//        'stopSuggestionKeys': [$.asuggestKeys.RETURN],
//        'delimiters': '\n ' // ideally not ' ' but requires modification to asuggest
//    });

    // handle input text area changes
    $('#input').on('input propertychange paste', function() {
        let input = textInput.value;
        const originalInput = input;

        input = input.replace(/->/g, '→');

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

        // set caret to last edited item instead of always at the end of the text area
        // e.g. when modifying "hello bye" to "hello -> bye" the caret ends at "hello →| bye"
        inputReversed = reverse(input);
        originalInputReversed = reverse(originalInput);
        for (let i=0; i < inputReversed.length; i++){
            if (inputReversed[i] != originalInputReversed[i]) {
                textInput.selectionEnd = input.length - i;
                break;
            }
        }
    });

    // handle copy button clicked
    $('#copy').click(function() {
        let clipboardText = pOutput.innerHTML

        // very pepega way of converting images back to emojis
        for (const emoji of emojiLUT) {
            clipboardText = clipboardText.replace(new RegExp('<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png.v=1">', 'g'), emoji[1]);
        }

        // copy to clipboard
        navigator.clipboard.writeText(clipboardText);

        var img = pOutput.toDataURL("image/png");
        document.write('<img src="'+img+'"/>');
    });
});
