const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImg');
const descriptionText = document.getElementById('modalDesc');
const captionText = document.getElementById('caption');
const closeBtn = document.getElementsByClassName('close')[0];
const structureSection = document.querySelector('.structure');

structureSection.addEventListener('click', (e) => {
  if (e.target.tagName === 'IMG' && e.target.closest('.structure-card')) {
    const detailUrl = e.target.dataset.detail;
    const decsContent = e.target.dataset.desc;

    if (window.matchMedia('(max-width: 768px)').matches) {
      modal.style.display = 'block';
    } else {
      modal.style.display = 'flex';
    }

    if (detailUrl) {
      modalImg.src = detailUrl;
    } else {
      modalImg.src = e.target.src;
    }

    captionText.innerHTML = e.target.alt;

    if (decsContent) {
      descriptionText.innerHTML = decsContent;
    } else {
      descriptionText.innerHTML = '';
    }
  }
});

closeBtn.onclick = function () {
  modal.style.display = 'none';
};

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.style.display === 'block') {
    modal.style.display = 'none';
  }
});
