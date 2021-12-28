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
    let clipboardText = "";

    $("#input").asuggest(emojiSuggestions, {
        'autoComplete': false,
        'cycleOnTab': true,
        'ignoreCase': true,
        'endingSymbols': '',
        'stopSuggestionKeys': [$.asuggestKeys.RETURN, $.asuggestKeys.LEFT],
        'delimiters': '\n ' // ideally not ' ' but requires modification to asuggest
    });

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

        let output = input;
        let outputSections = output.split(/(\[.*?\])/gi);   //split 'barge [barge]' to ['barge ', '[barge]']
        for (const emoji of emojiLUT) {
            for (let i=0; i < outputSections.length; i++) {

                // check that the section is not contained within '[]' really inefficient but it works
                if (!(outputSections[i].startsWith('[') && outputSections[i].endsWith(']'))) {

                    // check that the text contains the alias
                    if (outputSections[i].toLowerCase().includes(emoji[0])) {
                        outputSections[i] = outputSections[i].replace(new RegExp(emoji[0], "ig"), '<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png?v=1">');
                    }
                }
            }
        }

        // another pepega replace output sections containing '[text]' with 'text'
        for (let i=0; i < outputSections.length; i++) {
            if (outputSections[i].startsWith('[') && outputSections[i].endsWith(']')) {
                outputSections[i] = outputSections[i].slice(1, outputSections[i].length-1);
            }
        }

        // update input and output text
        textInput.value = input;
        clipboardText = outputSections.join('');

        pOutput.innerHTML = clipboardText.replace(/\n/g, '<br>');

        // set caret to last edited item instead of always at the end of the text area
        // e.g. when modifying "hello bye" to "hello -> bye" the caret ends at "hello →| bye"
        inputReversed = reverse(input);
        originalInputReversed = reverse(originalInput);
        for (let i=0; i < inputReversed.length; i++) {
            if (inputReversed[i] != originalInputReversed[i]) {
                textInput.selectionEnd = input.length - i;
                break;
            }
        }
    });


    // handle copy button clicked
    $('#copy').click(function() {
        // very pepega way of converting images back to emojis
        for (const emoji of emojiLUT) {
            clipboardText = clipboardText.replace(new RegExp('<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png.v=1">', 'g'), emoji[1]);
        }

        // copy to clipboard
        navigator.clipboard.writeText(clipboardText);
    });

    // handle change view button clicked
    $('#changeView').click(function() {
        let inputContainer = document.getElementById('inputContainer');
        let outputContainer = document.getElementById('outputContainer');

        if (this.innerHTML == '<i class="bi bi-view-stacked"></i> View') {
            this.innerHTML = '<i class="bi bi-layout-split"></i> View';
            inputContainer.className = 'col-md-12 p-3';
            outputContainer.className = 'col-md-12 p-3';
        }
        else {
            this.innerHTML = '<i class="bi bi-view-stacked"></i> View';
            inputContainer.className = 'col-md-6 p-3';
            outputContainer.className = 'col-md-6 p-3';
        }
    });
});
