// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let allExercises = [];
let selectedExercises = [];

// Verificar autenticación al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario
    document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
    
    // Cargar ejercicios disponibles
    loadExercises();
});

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    }
}

// Cargar todos los ejercicios
async function loadExercises() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('exercisesGrid');
    
    try {
        console.log('🔄 Cargando ejercicios...');
        const response = await fetch(`${API_URL}/ejercicios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.error('❌ No autorizado');
            logout();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        allExercises = await response.json();
        console.log('✅ Ejercicios cargados:', allExercises.length);
        
        if (allExercises.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💪</div>
                    <h3>No hay ejercicios disponibles</h3>
                    <p>Debes crear ejercicios primero usando Postman o la API</p>
                    <p style="margin-top: 15px; font-size: 0.9rem; color: var(--text-light);">
                        Ejemplo: POST /api/ejercicios<br>
                        {"nombre": "Sentadillas", "grupo_muscular": "Piernas"}
                    </p>
                </div>
            `;
            return;
        }
        
        displayExercises(allExercises);
        
    } catch (error) {
        console.error('❌ Error al cargar ejercicios:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error al cargar ejercicios</h3>
                <p>${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.9rem;">Verifica que el servidor esté corriendo en http://localhost:3000</p>
                <button class="btn-primary" onclick="loadExercises()" style="margin-top: 15px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

// Mostrar ejercicios en el grid
function displayExercises(exercises) {
    const container = document.getElementById('exercisesGrid');
    
    if (exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron ejercicios.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = exercises.map(exercise => {
        const isSelected = selectedExercises.some(e => e.id_ejercicio === exercise.id_ejercicio);
        return `
            <div class="exercise-item">
                <div class="exercise-info">
                    <h4>${exercise.nombre}</h4>
                    <p class="exercise-muscle">${exercise.grupo_muscular || 'Sin grupo'}</p>
                </div>
                <button 
                    class="btn-add-exercise" 
                    onclick="addExercise(${exercise.id_ejercicio})"
                    ${isSelected ? 'disabled' : ''}>
                    ${isSelected ? '✓ Agregado' : '+ Agregar'}
                </button>
            </div>
        `;
    }).join('');
}

// Filtrar ejercicios
function filterExercises() {
    const searchTerm = document.getElementById('searchExercise').value.toLowerCase();
    const muscleFilter = document.getElementById('muscleFilter').value;
    
    let filtered = allExercises;
    
    // Filtrar por texto de búsqueda
    if (searchTerm) {
        filtered = filtered.filter(exercise => 
            exercise.nombre.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtrar por grupo muscular
    if (muscleFilter) {
        filtered = filtered.filter(exercise => 
            exercise.grupo_muscular === muscleFilter
        );
    }
    
    displayExercises(filtered);
}

// Agregar ejercicio a la rutina
function addExercise(id_ejercicio) {
    const exercise = allExercises.find(e => e.id_ejercicio === id_ejercicio);
    if (!exercise) return;
    
    console.log('➕ Agregando ejercicio:', exercise.nombre);
    
    // Agregar con una serie por defecto
    selectedExercises.push({
        ...exercise,
        series: [
            { numero_serie: 1, repeticiones: 10, peso_usado: 0, descanso_segundos: 60 }
        ]
    });
    
    displaySelectedExercises();
    filterExercises(); // Actualizar el grid para mostrar el botón como agregado
}

// Mostrar ejercicios seleccionados
function displaySelectedExercises() {
    const container = document.getElementById('selectedExercises');
    
    if (selectedExercises.length === 0) {
        container.innerHTML = `
            <div class="empty-exercises">
                <p>No has agregado ejercicios aún. Selecciona ejercicios de la lista superior.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = selectedExercises.map((exercise, exerciseIndex) => `
        <div class="selected-exercise-card">
            <div class="exercise-card-header">
                <h4>${exercise.nombre}</h4>
                <button class="btn-remove-exercise" onclick="removeExercise(${exerciseIndex})">
                    🗑️ Eliminar
                </button>
            </div>
            <p class="exercise-muscle">${exercise.grupo_muscular || 'Sin grupo'}</p>
            
            <div class="series-container">
                <h5 style="margin-bottom: 10px;">Series:</h5>
                ${exercise.series.map((serie, serieIndex) => `
                    <div class="serie-item">
                        <span class="serie-number">Serie ${serie.numero_serie}</span>
                        <div style="display: flex; flex-direction: column; flex: 1;">
                            <label style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 2px;">Repeticiones</label>
                            <input 
                                type="number" 
                                class="serie-input" 
                                placeholder="10" 
                                value="${serie.repeticiones}"
                                min="1"
                                onchange="updateSerie(${exerciseIndex}, ${serieIndex}, 'repeticiones', this.value)">
                        </div>
                        <div style="display: flex; flex-direction: column; flex: 1;">
                            <label style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 2px;">Peso (kg)</label>
                            <input 
                                type="number" 
                                class="serie-input" 
                                placeholder="0" 
                                value="${serie.peso_usado}"
                                step="0.5"
                                min="0"
                                onchange="updateSerie(${exerciseIndex}, ${serieIndex}, 'peso_usado', this.value)">
                        </div>
                        <div style="display: flex; flex-direction: column; flex: 1;">
                            <label style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 2px;">Descanso (seg)</label>
                            <input 
                                type="number" 
                                class="serie-input" 
                                placeholder="60" 
                                value="${serie.descanso_segundos}"
                                min="0"
                                onchange="updateSerie(${exerciseIndex}, ${serieIndex}, 'descanso_segundos', this.value)">
                        </div>
                        ${exercise.series.length > 1 ? `
                            <button class="btn-remove-serie" onclick="removeSerie(${exerciseIndex}, ${serieIndex})" title="Eliminar serie">✕</button>
                        ` : ''}
                    </div>
                `).join('')}
                <button class="btn-add-serie" onclick="addSerie(${exerciseIndex})">+ Agregar Serie</button>
            </div>
        </div>
    `).join('');
}

// Eliminar ejercicio de la selección
function removeExercise(exerciseIndex) {
    console.log('🗑️ Eliminando ejercicio');
    selectedExercises.splice(exerciseIndex, 1);
    displaySelectedExercises();
    filterExercises(); // Actualizar el grid
}

// Agregar serie a un ejercicio
function addSerie(exerciseIndex) {
    const exercise = selectedExercises[exerciseIndex];
    const newSerieNumber = exercise.series.length + 1;
    
    exercise.series.push({
        numero_serie: newSerieNumber,
        repeticiones: 10,
        peso_usado: 0,
        descanso_segundos: 60
    });
    
    displaySelectedExercises();
}

// Eliminar serie de un ejercicio
function removeSerie(exerciseIndex, serieIndex) {
    selectedExercises[exerciseIndex].series.splice(serieIndex, 1);
    
    // Renumerar las series
    selectedExercises[exerciseIndex].series.forEach((serie, index) => {
        serie.numero_serie = index + 1;
    });
    
    displaySelectedExercises();
}

// Actualizar datos de una serie
function updateSerie(exerciseIndex, serieIndex, field, value) {
    selectedExercises[exerciseIndex].series[serieIndex][field] = parseFloat(value) || 0;
}

// Cancelar y volver al dashboard
function cancelRoutine() {
    if (selectedExercises.length > 0) {
        if (!confirm('¿Estás seguro? Se perderán todos los cambios.')) {
            return;
        }
    }
    window.location.href = 'dashboard.html';
}

// Guardar rutina
async function saveRoutine() {
    const nombre = document.getElementById('routineName').value.trim();
    const fecha = document.getElementById('routineDate').value || null;
    
    // Validaciones
    if (!nombre) {
        showMessage('Por favor ingresa un nombre para la rutina', 'error');
        return;
    }
    
    if (selectedExercises.length === 0) {
        showMessage('Debes agregar al menos un ejercicio a la rutina', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        console.log('💾 Guardando rutina:', nombre);
        
        // 1. Crear la rutina
        const rutinaResponse = await fetch(`${API_URL}/rutinas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, fecha })
        });
        
        if (!rutinaResponse.ok) {
            const data = await rutinaResponse.json();
            throw new Error(data.error || 'Error al crear la rutina');
        }
        
        const rutinaData = await rutinaResponse.json();
        const id_rutina = rutinaData.id_rutina;
        
        console.log('✅ Rutina creada con ID:', id_rutina);
        
        // 2. Agregar las series de cada ejercicio
        for (const exercise of selectedExercises) {
            for (const serie of exercise.series) {
                console.log(`📝 Agregando serie ${serie.numero_serie} de ${exercise.nombre}`);
                
                const serieResponse = await fetch(`${API_URL}/series`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id_rutina: id_rutina,
                        id_ejercicio: exercise.id_ejercicio,
                        numero_serie: serie.numero_serie,
                        repeticiones: serie.repeticiones,
                        peso_usado: serie.peso_usado,
                        descanso_segundos: serie.descanso_segundos
                    })
                });
                
                if (!serieResponse.ok) {
                    console.error('Error al agregar serie:', await serieResponse.json());
                }
            }
        }
        
        showMessage('¡Rutina creada exitosamente!', 'success');
        
        // Redirigir al dashboard después de 1.5 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showMessage(error.message || 'Error al guardar la rutina', 'error');
    }
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