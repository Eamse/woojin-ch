/**
 * Admin Projects - Create Only
 * 프로젝트 등록 전용 페이지
 */

console.log('📝 [Admin Projects Create] Script Loaded');

// 🌐 환경 자동 감지
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE = isLocalhost
    ? 'http://localhost:4000/api'      // 로컬 개발
    : 'https://woojin-ch.kr/api';      // 프로덕션

console.log('🌐 API_BASE:', API_BASE, isLocalhost ? '(로컬 환경)' : '(프로덕션)');

// DOM Elements
const form = document.getElementById('createForm');
const submitBtn = document.getElementById('submitBtn');
const costListContainer = document.getElementById('costListContainer');
const btnAddCost = document.getElementById('btnAddCost');
const totalPriceDisplay = document.getElementById('totalPriceDisplay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initForm();
});

function initForm() {
    // Form submit handler
    form.addEventListener('submit', handleFormSubmit);

    // Cost item handlers
    btnAddCost.addEventListener('click', () => addCostItem());

    console.log('✅ Form initialized');
}

// ============================================
// Cost Management
// ============================================

function addCostItem(label = '', amount = '') {
    const div = document.createElement('div');
    div.className = 'cost-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '8px';

    div.innerHTML = `
        <input 
            type="text" 
            class="cost-label" 
            placeholder="항목 (예: 철거공사)" 
            value="${label}" 
            style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <input 
            type="number" 
            class="cost-amount" 
            placeholder="금액 (만원)" 
            value="${amount}" 
            style="width: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <button 
            type="button" 
            class="btn-remove-cost" 
            style="background: #fff; border: 1px solid #fca5a5; color: #ef4444; border-radius: 4px; cursor: pointer; padding: 8px 12px;">
            삭제
        </button>
    `;

    div.querySelector('.btn-remove-cost').addEventListener('click', () => {
        div.remove();
        calculateTotal();
    });

    div.querySelector('.cost-amount').addEventListener('input', calculateTotal);
    costListContainer.appendChild(div);
    calculateTotal();
}

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.cost-amount').forEach(input => {
        const value = parseInt(input.value) || 0;
        total += value;
    });
    totalPriceDisplay.value = total.toLocaleString();
}

// ============================================
// Form Submit
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 등록 중...';
    }

    try {
        const formData = new FormData(form);

        // Collect cost items
        const costs = [];
        document.querySelectorAll('.cost-item').forEach(item => {
            const label = item.querySelector('.cost-label').value;
            const amount = item.querySelector('.cost-amount').value;
            if (label && amount) {
                costs.push({ label, amount });
            }
        });

        // Add costs as JSON
        formData.append('costs', JSON.stringify(costs));

        // Submit
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // 401 에러 시 자동 로그아웃
        if (res.status === 401) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('token');
            window.location.href = '/admin-login.html';
            return;
        }

        if (!res.ok) {
            throw new Error('등록 실패');
        }

        const data = await res.json();

        alert('프로젝트가 성공적으로 등록되었습니다!');

        // Redirect to gallery
        window.location.href = '/admin-gallery.html';

    } catch (error) {
        console.error('❌ Error:', error);
        alert('등록 중 오류가 발생했습니다: ' + error.message);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> 등록하기';
        }
    }
}
