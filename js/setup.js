const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let displayWidth = canvas.width;
let displayHeight = canvas.height;
canvas.style.width = displayWidth + "px";
canvas.style.height = displayHeight + "px";
canvas.width *= UPSCALE;
canvas.height *= UPSCALE;

let mousePos = [0, 0];
canvas.addEventListener("mousemove", event => {
    let rect = event.target.getBoundingClientRect();
    mousePos = [event.clientX - rect.left, event.clientY - rect.top].map(i => i * UPSCALE);
});

let mouseIsDown = false;
let mouseIsDownThisFrame = false;
let mouseRightClickedThisFrame = false;
let mouseLastClickWasShift = false;
document.addEventListener("mousedown", event => {
    mouseIsDown = true;
    mouseIsDownThisFrame = true;
    if (event.button === 2) mouseRightClickedThisFrame = true;
    mouseLastClickWasShift = event.shiftKey;
});
document.addEventListener("mouseup", event => {mouseIsDown = false;});
canvas.addEventListener("contextmenu", event => event.preventDefault());

ctx.font = `${FONT_SIZE * UPSCALE}px Noto Sans`;