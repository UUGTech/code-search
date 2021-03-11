(function() {
    const vscode = acquireVsCodeApi();
    
    const oldState = vscode.getState();

    window.addEventListener('message', event=>{
        // get message
        const message = event.data;

        // add title or code
        switch(message.command){
            case 'addTitle':
                const resultsDiv = document.getElementById('results-div');
                resultsDiv.innerHTML += `<h2 class="page-title">${message.title}</h2><div class="code-area" id="code-area-of-${message.num}"></div>`;
                break;
            case 'addCode':
                const codeArea = document.getElementById(`code-area-of-${message.num}`);
                const divElement = document.createElement('div');
                divElement.className = "code-frame";
                const preElement = document.createElement('pre');
                const codeElement = document.createElement('code');
                codeElement.innerText = message.code;
                preElement.classList.add('prettyprint');
                preElement.classList.add('linenums');
                preElement.appendChild(codeElement);
                divElement.appendChild(preElement);
                codeArea.appendChild(divElement);
                break;
            default:
                break;
        }

        // code-prettify
        PR.prettyPrint();
    });

}());