const marker = document.createElement('div');
marker.id = 'from-extension';
marker.textContent = 'foo';
document.body.append(marker);

const image = document.createElement('img');
image.id = 'image-from-extension';
image.src = chrome.runtime.getURL('assets/image.svg');
document.body.append(image);
