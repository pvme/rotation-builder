const discordEmojiRegex = new RegExp("<:([^:]{2,}):([0-9]+)>", 'i');

var emojiLUT = [];
// var emojiSuggestions = [];


async function rawGithubGetRequest(url) {
    const res = await fetch(url, {
        method: 'GET'
    });
    
    if (!res.ok)
        throw new Error(await res.text());

    return res;
}

async function rawGithubJSONRequest(url) {
    const res = await rawGithubGetRequest(url);
    return await res.json();
}

async function setEmojiLUTAndSuggestions() {
    const emojisJSON = await rawGithubJSONRequest('https://raw.githubusercontent.com/pvme/pvme-settings/master/emojis/emojis.json');
    // emojiLUT = [];
    let emojiSuggestions = [];
    for (const category of emojisJSON.categories) {
        for (const emoji of category.emojis) {
            const emojiFormat = `<:${emoji.emoji_name}:${emoji.emoji_id}>`;
            emojiLUT.push([emoji.emoji_name, emojiFormat]);
            emojiSuggestions.push(emoji.emoji_name);
            for (const alias of emoji.aliases) {
                emojiLUT.push([alias, emojiFormat]);
                emojiSuggestions.push(alias);
            }
        }
    }

    emojiLUT.sort( (a, b) => {
        return b[0].length - a[0].length;
    });

    emojiSuggestions.sort( (a, b) => {
        return a.length - b.length;
    });

    $("#input").asuggest(emojiSuggestions, {
        'autoComplete': false,
        'cycleOnTab': true,
        'ignoreCase': true,
        'endingSymbols': '',
        'stopSuggestionKeys': [$.asuggestKeys.RETURN, $.asuggestKeys.LEFT],
        'delimiters': '\n ' // ideally not ' ' but requires modification to asuggest
    });
}

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
    
    setEmojiLUTAndSuggestions();

    // $("#input").asuggest(emojiSuggestions, {
    //     'autoComplete': false,
    //     'cycleOnTab': true,
    //     'ignoreCase': true,
    //     'endingSymbols': '',
    //     'stopSuggestionKeys': [$.asuggestKeys.RETURN, $.asuggestKeys.LEFT],
    //     'delimiters': '\n ' // ideally not ' ' but requires modification to asuggest
    // });

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
                        // replace emoji aliases with ${{emojiId}}
                        // this template will later be replaced with the actual image url
                        // this is because the image url contains class="disc-emoji" which conflicts with a emoji alias names "sc" 
                        outputSections[i] = outputSections[i].replace(new RegExp(emoji[0], "ig"), '${{' + discordEmojiRegex.exec(emoji[1])[2] + '}}');
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
        clipboardText = outputSections
            // convert sections back to string
            .join('')
            
            // replace ${{emojiId}} with <img class="disc-emoji" src="https://cdn.discordapp.com/emojis/emojiId.png?v=1">
            .replace(/\${{(\d+)}}/g, (_, emojiId) =>
                `<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/${emojiId}.png?v=1">`
            );

        pOutput.innerHTML = clipboardText
            // replace \n with <br>
            .replace(/\n/g, '<br>');

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


    // handle copy discord button clicked
    $('#copyDiscord').click(function() {
        let copyResult = clipboardText;
        
        // very pepega way of converting images back to emojis
        for (const emoji of emojiLUT) {
            copyResult = copyResult.replace(new RegExp('<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png.v=1">', 'g'), emoji[1]);
        }

        // copy to clipboard
        navigator.clipboard.writeText(copyResult);
    });

     // handle copy draw.io button clicked
     $('#copyDrawIO').click(function() {
        let copyResult = clipboardText.replace(/class="disc-emoji"/gi, `style="width: 1.375em; height: 1.375em !important; object-fit: contain; vertical-align: middle;"`);
        
        // copy to clipboard
        navigator.clipboard.writeText(copyResult);
    });

    // handle export to .txt button clicked
     $('#exportToTxt').click(function() {
        let copyResult = clipboardText;
        
        // very pepega way of converting images back to emojis
        for (const emoji of emojiLUT) {
            copyResult = copyResult.replace(new RegExp('<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/' + discordEmojiRegex.exec(emoji[1])[2] + '.png.v=1">', 'g'), emoji[1]);
        }
         const file = new File([copyResult], 'RotationBuilderExport.txt', {
             type: 'text/plain',
         });
         const link = document.createElement('a');
         const url = URL.createObjectURL(file);

         link.href = url;
         link.download = file.name;
         document.body.appendChild(link);
         link.click();

         document.body.removeChild(link);
         window.URL.revokeObjectURL(url);
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
