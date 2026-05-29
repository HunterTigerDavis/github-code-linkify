// test function
async function sayHello() {
    console.log("Hello from the extension!");
    let [tab] = await chrome.tabs.query({ active: true });
    chrome.activescripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // inject into the actual page context to access DOM and find links, then display in popup
            document.body
            
            alert("Hello from the extension!");
        }
    });
}
document.getElementById("scanButton").addEventListener("click", sayHello);

// Call script to scan page for links when popup is opened
// async function scanPageForLinks() {