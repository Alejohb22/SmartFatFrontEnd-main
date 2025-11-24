// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Verificar autenticación y cargar datos
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
    
    // Cargar todas las estadísticas
    loadAllStats();
});

// ========================================
// FUNCIONES DEL MENÚ LATERAL
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
});

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    }
}

// ========================================
// FUNCIONES DE ESTADÍSTICAS
// ========================================

async function loadAllStats() {
    console.log('📊 Cargando estadísticas...');
    
    await Promise.all([
        loadGeneralStats(),
        loadProgressByExercise(),
        loadRecentHistory(),
        loadMuscleGroupDistribution()
    ]);
}

// Cargar estadísticas generales
async function loadGeneralStats() {
    const token = localStorage.getItem('token');
    
    try {
        console.log('📈 Cargando estadísticas generales...');
        
        const response = await fetch(`${API_URL}/historial/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        
        const stats = await response.json();
        console.log('✅ Estadísticas generales:', stats);
        
        // Actualizar los contadores
        document.getElementById('totalRutinas').textContent = stats.total_rutinas || 0;
        document.getElementById('ejerciciosDiferentes').textContent = stats.ejercicios_diferentes || 0;
        document.getElementById('totalSeries').textContent = stats.total_series || 0;
        document.getElementById('totalRepeticiones').textContent = stats.total_repeticiones || 0;
        
        // Mostrar última sesión
        displayLastSession(stats.ultima_sesion);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage('Error al cargar estadísticas generales', 'error');
    }
}

// Mostrar última sesión
function displayLastSession(fecha) {
    const container = document.getElementById('lastSessionInfo');
    
    if (!fecha) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>📅 Aún no tienes entrenamientos registrados</p>
            </div>
        `;
        return;
    }
    
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferenciaDias = Math.floor((ahora - fechaObj) / (1000 * 60 * 60 * 24));
    
    let tiempoTexto = '';
    if (diferenciaDias === 0) {
        tiempoTexto = 'Hoy';
    } else if (diferenciaDias === 1) {
        tiempoTexto = 'Ayer';
    } else if (diferenciaDias < 7) {
        tiempoTexto = `Hace ${diferenciaDias} días`;
    } else if (diferenciaDias < 30) {
        const semanas = Math.floor(diferenciaDias / 7);
        tiempoTexto = `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
    } else {
        const meses = Math.floor(diferenciaDias / 30);
        tiempoTexto = `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }
    
    container.innerHTML = `
        <div class="last-session-info">
            <div class="session-icon">🏋️</div>
            <div class="session-details">
                <p class="session-date">${fechaObj.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
                <p class="session-time">${tiempoTexto}</p>
            </div>
        </div>
    `;
}

// Cargar progreso por ejercicio
async function loadProgressByExercise() {
    const token = localStorage.getItem('token');
    
    try {
        console.log('💪 Cargando progreso por ejercicio...');
        
        const response = await fetch(`${API_URL}/historial/progreso`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar progreso');
        }
        
        const progreso = await response.json();
        console.log('✅ Progreso cargado:', progreso);
        
        displayProgress(progreso);
        
    } catch (error) {
        console.error('❌ Error:', error);
        const container = document.getElementById('progresoEjercicios');
        container.innerHTML = `
            <div class="empty-state-small">
                <p>⚠️ No se pudo cargar el progreso</p>
            </div>
        `;
    }
}

// Mostrar progreso por ejercicio
function displayProgress(progreso) {
    const container = document.getElementById('progresoEjercicios');
    
    if (progreso.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>📊 No hay datos de progreso aún</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = progreso.map(item => {
        const porcentaje = ((item.peso_maximo / item.peso_promedio) - 1) * 100;
        const color = porcentaje > 20 ? '#10b981' : porcentaje > 0 ? '#f59e0b' : '#ef4444';
        
        return `
            <div class="progreso-item">
                <div class="progreso-header">
                    <h4>${item.ejercicio}</h4>
                    <span class="progreso-badge">${item.veces_realizado} ${item.veces_realizado === 1 ? 'vez' : 'veces'}</span>
                </div>
                <div class="progreso-stats">
                    <div class="progreso-stat">
                        <span class="stat-label-small">Peso Máximo</span>
                        <span class="stat-value-small" style="color: ${color}">${item.peso_maximo} kg</span>
                    </div>
                    <div class="progreso-stat">
                        <span class="stat-label-small">Promedio</span>
                        <span class="stat-value-small">${parseFloat(item.peso_promedio).toFixed(1)} kg</span>
                    </div>
                    <div class="progreso-stat">
                        <span class="stat-label-small">Mínimo</span>
                        <span class="stat-value-small">${item.peso_minimo} kg</span>
                    </div>
                </div>
                <div class="progreso-bar-container">
                    <div class="progreso-bar" style="width: ${Math.min((item.peso_maximo / 200) * 100, 100)}%; background: ${color}"></div>
                </div>
                <p class="progreso-date">Última vez: ${new Date(item.ultima_vez).toLocaleDateString('es-ES')}</p>
            </div>
        `;
    }).join('');
}

// Cargar historial reciente
async function loadRecentHistory() {
    const token = localStorage.getItem('token');
    
    try {
        console.log('🕐 Cargando historial reciente...');
        
        const response = await fetch(`${API_URL}/historial/completo?limite=20`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar historial');
        }
        
        const historial = await response.json();
        console.log('✅ Historial cargado:', historial);
        
        displayHistory(historial);
        
    } catch (error) {
        console.error('❌ Error:', error);
        const container = document.getElementById('historialReciente');
        container.innerHTML = `
            <div class="empty-state-small">
                <p>⚠️ No se pudo cargar el historial</p>
            </div>
        `;
    }
}

// Mostrar historial
function displayHistory(historial) {
    const container = document.getElementById('historialReciente');
    
    if (historial.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>📝 No hay registros en el historial</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="historial-table">
            ${historial.map(item => `
                <div class="historial-row">
                    <div class="historial-date">
                        ${new Date(item.fecha_registro).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short' 
                        })}
                    </div>
                    <div class="historial-exercise">
                        <span class="exercise-name">${item.ejercicio_nombre}</span>
                        <span class="exercise-group">${item.grupo_muscular || 'Sin grupo'}</span>
                    </div>
                    <div class="historial-details">
                        <span class="detail-item">${item.repeticiones} reps</span>
                        <span class="detail-separator">×</span>
                        <span class="detail-item weight">${item.peso_usado} kg</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Cargar distribución por grupo muscular
async function loadMuscleGroupDistribution() {
    const token = localStorage.getItem('token');
    
    try {
        console.log('🎯 Cargando distribución muscular...');
        
        const response = await fetch(`${API_URL}/historial/progreso`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar distribución');
        }
        
        const progreso = await response.json();
        
        // Agrupar por grupo muscular
        const gruposMapa = {};
        progreso.forEach(item => {
            const grupo = item.grupo_muscular || 'Sin clasificar';
            if (!gruposMapa[grupo]) {
                gruposMapa[grupo] = {
                    nombre: grupo,
                    ejercicios: 0,
                    veces: 0
                };
            }
            gruposMapa[grupo].ejercicios++;
            gruposMapa[grupo].veces += item.veces_realizado;
        });
        
        const grupos = Object.values(gruposMapa);
        console.log('✅ Distribución muscular:', grupos);
        
        displayMuscleGroups(grupos);
        
    } catch (error) {
        console.error('❌ Error:', error);
        const container = document.getElementById('gruposMusculares');
        container.innerHTML = `
            <div class="empty-state-small">
                <p>⚠️ No se pudo cargar la distribución</p>
            </div>
        `;
    }
}

// Mostrar grupos musculares
function displayMuscleGroups(grupos) {
    const container = document.getElementById('gruposMusculares');
    
    if (grupos.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>🎯 No hay datos de grupos musculares</p>
            </div>
        `;
        return;
    }
    
    const totalVeces = grupos.reduce((sum, g) => sum + g.veces, 0);
    
    container.innerHTML = grupos.map(grupo => {
        const porcentaje = (grupo.veces / totalVeces * 100).toFixed(1);
        const color = getColorForMuscleGroup(grupo.nombre);
        
        return `
            <div class="grupo-item">
                <div class="grupo-info">
                    <h4>${grupo.nombre}</h4>
                    <span class="grupo-count">${grupo.ejercicios} ${grupo.ejercicios === 1 ? 'ejercicio' : 'ejercicios'}</span>
                </div>
                <div class="grupo-stats">
                    <span class="grupo-veces">${grupo.veces} entrenamientos</span>
                    <span class="grupo-porcentaje">${porcentaje}%</span>
                </div>
                <div class="grupo-bar-container">
                    <div class="grupo-bar" style="width: ${porcentaje}%; background: ${color}"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Obtener color para grupo muscular
function getColorForMuscleGroup(grupo) {
    const colores = {
        'Pecho': '#ef4444',
        'Espalda': '#3b82f6',
        'Hombros': '#f59e0b',
        'Bíceps': '#8b5cf6',
        'Tríceps': '#ec4899',
        'Piernas': '#10b981',
        'Abdomen': '#06b6d4',
        'Cardio': '#f97316'
    };
    return colores[grupo] || '#6b7280';
}

// Mostrar mensaje
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}