// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Verificar autenticación al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario en navbar
    document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
    
    // Mostrar información del usuario en sidebar
    if (document.getElementById('userNameSidebar')) {
        document.getElementById('userNameSidebar').textContent = usuario.nombre || 'Usuario';
    }
    if (document.getElementById('userEmailSidebar')) {
        document.getElementById('userEmailSidebar').textContent = usuario.correo || 'email@example.com';
    }
    
    // Cargar rutinas
    loadRoutines();
});

// ========================================
// FUNCIONES DEL MENÚ LATERAL
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Prevenir scroll del body cuando el menú está abierto
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Cerrar sidebar al hacer clic en un enlace (opcional)
document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Si es un enlace de navegación (no un onclick), cerrar el sidebar
            if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
                toggleSidebar();
            }
        });
    });
});

// Cerrar sidebar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
});

// ========================================
// FUNCIONES EXISTENTES
// ========================================

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    }
}

// Cargar rutinas del usuario
async function loadRoutines() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('routinesContainer');
    
    try {
        const response = await fetch(`${API_URL}/rutinas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        
        const rutinas = await response.json();
        
        if (rutinas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No tienes rutinas aún</h3>
                    <p>Crea tu primera rutina para comenzar a entrenar</p>
                    <button class="btn-primary" onclick="openAddRoutineModal()">Crear Primera Rutina</button>
                </div>
            `;
            return;
        }
        
        // Renderizar rutinas
        container.innerHTML = rutinas.map(rutina => `
            <div class="routine-card">
                <h3>${rutina.nombre}</h3>
                <p class="routine-date">
                    ${rutina.fecha ? formatDate(rutina.fecha) : 'Sin fecha asignada'}
                </p>
                <div class="routine-actions">
                    <button class="btn-small btn-start" onclick="startRoutine(${rutina.id_rutina})">
                        ▶ Entrenar
                    </button>
                    <button class="btn-small btn-edit" onclick="editRoutine(${rutina.id_rutina})">
                        ✏️
                    </button>
                    <button class="btn-small btn-delete-small" onclick="deleteRoutine(${rutina.id_rutina}, '${rutina.nombre}')">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error al cargar las rutinas</h3>
                <p>Verifica tu conexión e intenta nuevamente</p>
                <button class="btn-primary" onclick="loadRoutines()">Reintentar</button>
            </div>
        `;
    }
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

// Redirigir a la página de crear rutina
function openAddRoutineModal() {
    window.location.href = 'create-rutine.html';
}

// Iniciar rutina (redirigir a página de entrenamiento)
function startRoutine(id_rutina) {
    window.location.href = `workout.html?id=${id_rutina}`;
}

// Editar rutina
function editRoutine(id_rutina) {
    alert(`Función de edición en desarrollo para rutina ID: ${id_rutina}`);
    // TODO: Implementar modal de edición
}

// Eliminar rutina
async function deleteRoutine(id_rutina, nombre) {
    if (!confirm(`¿Estás seguro de eliminar la rutina "${nombre}"? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/rutinas/${id_rutina}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadRoutines();
        } else {
            const data = await response.json();
            alert(data.error || 'Error al eliminar la rutina');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}