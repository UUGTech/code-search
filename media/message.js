(function() {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', event=>{
        // get message
        const message = event.data;

        // add title, code, url
        switch(message.command){
            case 'addTitle':
                const resultsDiv = document.getElementById('results-div');
                resultsDiv.innerHTML += `<h2 class="page-title">${message.title}</h2><div class="link-area" id="link-area-of-${message.num}"></div><div class="code-area" id="code-area-of-${message.num}"></div>`;
                break;
            case 'addLink':
                const linkArea = document.getElementById(`link-area-of-${message.num}`);
                linkArea.innerHTML = `<a href="${message.url}">${message.url}</a>`;
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