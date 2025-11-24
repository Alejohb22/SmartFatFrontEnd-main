// API Configuration
const API_URL = 'http://localhost:3000/api';
let currentRoutineId = null;
let allExercises = [];
let currentExercises = [];
let seriesToDelete = null;

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Obtener el ID de la rutina de la URL
    const urlParams = new URLSearchParams(window.location.search);
    currentRoutineId = urlParams.get('id');
    
    if (!currentRoutineId) {
        showMessage('No se especificó una rutina para editar', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    loadUserName();
    loadRoutineData();
    loadAllExercises();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function loadUserName() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.nombre) {
        document.getElementById('userName').textContent = user.nombre;
    }
}

// ========================================
// CARGAR DATOS DE LA RUTINA
// ========================================

async function loadRoutineData() {
    try {
        const response = await fetch(`${API_URL}/rutinas/${currentRoutineId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Rutina no encontrada');
            }
            throw new Error('Error al cargar la rutina');
        }

        const data = await response.json();
        
        // Llenar campos de la rutina
        document.getElementById('routineName').value = data.rutina.nombre;
        
        if (data.rutina.fecha) {
            const date = new Date(data.rutina.fecha);
            document.getElementById('routineDate').value = date.toISOString().split('T')[0];
        }
        
        // Cargar ejercicios actuales
        currentExercises = data.series || [];
        displayCurrentExercises();
        
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message || 'Error al cargar la rutina', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
}

// ========================================
// MOSTRAR EJERCICIOS ACTUALES
// ========================================

function displayCurrentExercises() {
    const container = document.getElementById('currentExercises');
    
    if (currentExercises.length === 0) {
        container.innerHTML = `
            <div class="empty-exercises">
                <p>No hay ejercicios en esta rutina aún. Agrega algunos desde la sección de abajo.</p>
            </div>
        `;
        return;
    }
    
    // Agrupar series por ejercicio
    const exerciseGroups = {};
    currentExercises.forEach(serie => {
        const key = serie.id_ejercicio;
        if (!exerciseGroups[key]) {
            exerciseGroups[key] = {
                id_ejercicio: serie.id_ejercicio,
                nombre: serie.ejercicio_nombre,
                grupo_muscular: serie.grupo_muscular,
                series: []
            };
        }
        exerciseGroups[key].series.push(serie);
    });
    
    // Renderizar
    container.innerHTML = Object.values(exerciseGroups).map(exercise => `
        <div class="selected-exercise-item">
            <div class="exercise-header">
                <div>
                    <h4>${exercise.nombre}</h4>
                    <span class="exercise-muscle">${exercise.grupo_muscular}</span>
                </div>
            </div>
            <div class="series-list">
                ${exercise.series.map(serie => `
                    <div class="serie-item" data-serie-id="${serie.id_serie}">
                        <div class="serie-info">
                            <span class="serie-number">Serie ${serie.numero_serie}</span>
                            <div class="serie-details">
                                <input 
                                    type="number" 
                                    class="serie-input" 
                                    placeholder="Reps" 
                                    value="${serie.repeticiones}"
                                    onchange="updateSerie(${serie.id_serie}, 'repeticiones', this.value)">
                                <span>reps</span>
                                <input 
                                    type="number" 
                                    step="0.5" 
                                    class="serie-input" 
                                    placeholder="Peso" 
                                    value="${serie.peso_usado || ''}"
                                    onchange="updateSerie(${serie.id_serie}, 'peso_usado', this.value)">
                                <span>kg</span>
                                <input 
                                    type="number" 
                                    class="serie-input" 
                                    placeholder="Descanso" 
                                    value="${serie.descanso_segundos || 60}"
                                    onchange="updateSerie(${serie.id_serie}, 'descanso_segundos', this.value)">
                                <span>seg</span>
                            </div>
                        </div>
                        <button class="btn-delete-serie" onclick="deleteSerie(${serie.id_serie})" title="Eliminar serie">
                            🗑️
                        </button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-serie" onclick="addSerieToExercise(${exercise.id_ejercicio}, '${exercise.nombre}')">
                ➕ Agregar Serie
            </button>
        </div>
    `).join('');
}

// ========================================
// ACTUALIZAR SERIE
// ========================================

async function updateSerie(idSerie, field, value) {
    try {
        // Encontrar la serie actual
        const serie = currentExercises.find(s => s.id_serie === idSerie);
        if (!serie) return;
        
        // Preparar datos para actualizar
        const updateData = {
            numero_serie: serie.numero_serie,
            repeticiones: field === 'repeticiones' ? parseInt(value) : serie.repeticiones,
            peso_usado: field === 'peso_usado' ? parseFloat(value) || null : serie.peso_usado,
            descanso_segundos: field === 'descanso_segundos' ? parseInt(value) : serie.descanso_segundos
        };
        
        const response = await fetch(`${API_URL}/series/${idSerie}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar la serie');
        }
        
        // Actualizar en el array local
        const index = currentExercises.findIndex(s => s.id_serie === idSerie);
        if (index !== -1) {
            currentExercises[index] = { ...currentExercises[index], ...updateData };
        }
        
        showMessage('Serie actualizada', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al actualizar la serie', 'error');
    }
}

// ========================================
// ELIMINAR SERIE
// ========================================

function deleteSerie(idSerie) {
    seriesToDelete = idSerie;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    seriesToDelete = null;
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDeleteSerie() {
    if (!seriesToDelete) return;
    
    try {
        const response = await fetch(`${API_URL}/series/${seriesToDelete}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar la serie');
        }
        
        // Eliminar del array local
        currentExercises = currentExercises.filter(s => s.id_serie !== seriesToDelete);
        
        displayCurrentExercises();
        showMessage('Serie eliminada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al eliminar la serie', 'error');
    } finally {
        closeDeleteModal();
    }
}

// ========================================
// AGREGAR NUEVA SERIE A EJERCICIO EXISTENTE
// ========================================

async function addSerieToExercise(idEjercicio, nombreEjercicio) {
    try {
        // Obtener el número de series actuales para este ejercicio
        const seriesDelEjercicio = currentExercises.filter(s => s.id_ejercicio === idEjercicio);
        const numeroSerie = seriesDelEjercicio.length + 1;
        
        const serieData = {
            id_rutina: parseInt(currentRoutineId),
            id_ejercicio: idEjercicio,
            numero_serie: numeroSerie,
            repeticiones: 10,
            peso_usado: null,
            descanso_segundos: 60
        };
        
        const response = await fetch(`${API_URL}/series`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(serieData)
        });
        
        if (!response.ok) {
            throw new Error('Error al agregar la serie');
        }
        
        const result = await response.json();
        
        // Agregar al array local
        currentExercises.push({
            id_serie: result.id_serie,
            id_ejercicio: idEjercicio,
            ejercicio_nombre: nombreEjercicio,
            numero_serie: numeroSerie,
            repeticiones: 10,
            peso_usado: null,
            descanso_segundos: 60
        });
        
        displayCurrentExercises();
        showMessage('Serie agregada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al agregar la serie', 'error');
    }
}

// ========================================
// CARGAR EJERCICIOS DISPONIBLES
// ========================================

async function loadAllExercises() {
    try {
        const response = await fetch(`${API_URL}/ejercicios`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al cargar ejercicios');
        }

        allExercises = await response.json();
        displayAvailableExercises(allExercises);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('exercisesGrid').innerHTML = `
            <div class="empty-state">
                <p>Error al cargar los ejercicios disponibles</p>
            </div>
        `;
    }
}

function displayAvailableExercises(exercises) {
    const container = document.getElementById('exercisesGrid');
    
    if (exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron ejercicios</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = exercises.map(exercise => {
        // Verificar si el ejercicio ya está en la rutina
        const alreadyAdded = currentExercises.some(s => s.id_ejercicio === exercise.id_ejercicio);
        
        return `
            <div class="exercise-item">
                <div class="exercise-info">
                    <h4>${exercise.nombre}</h4>
                    <span class="exercise-muscle">${exercise.grupo_muscular || 'General'}</span>
                </div>
                <button 
                    class="btn-add-exercise" 
                    onclick="addNewExerciseToRoutine(${exercise.id_ejercicio}, '${exercise.nombre}', '${exercise.grupo_muscular || 'General'}')"
                    ${alreadyAdded ? 'disabled' : ''}>
                    ${alreadyAdded ? 'Agregado ✓' : 'Agregar'}
                </button>
            </div>
        `;
    }).join('');
}

// ========================================
// AGREGAR NUEVO EJERCICIO A LA RUTINA
// ========================================

async function addNewExerciseToRoutine(idEjercicio, nombreEjercicio, grupoMuscular) {
    try {
        const serieData = {
            id_rutina: parseInt(currentRoutineId),
            id_ejercicio: idEjercicio,
            numero_serie: 1,
            repeticiones: 10,
            peso_usado: null,
            descanso_segundos: 60
        };
        
        const response = await fetch(`${API_URL}/series`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(serieData)
        });
        
        if (!response.ok) {
            throw new Error('Error al agregar el ejercicio');
        }
        
        const result = await response.json();
        
        // Agregar al array local
        currentExercises.push({
            id_serie: result.id_serie,
            id_ejercicio: idEjercicio,
            ejercicio_nombre: nombreEjercicio,
            grupo_muscular: grupoMuscular,
            numero_serie: 1,
            repeticiones: 10,
            peso_usado: null,
            descanso_segundos: 60
        });
        
        displayCurrentExercises();
        displayAvailableExercises(allExercises);
        showMessage('Ejercicio agregado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al agregar el ejercicio', 'error');
    }
}

// ========================================
// FILTRAR EJERCICIOS
// ========================================

function filterExercises() {
    const searchTerm = document.getElementById('searchExercise').value.toLowerCase();
    const muscleFilter = document.getElementById('muscleFilter').value;
    
    const filtered = allExercises.filter(exercise => {
        const matchesSearch = exercise.nombre.toLowerCase().includes(searchTerm);
        const matchesMuscle = !muscleFilter || exercise.grupo_muscular === muscleFilter;
        return matchesSearch && matchesMuscle;
    });
    
    displayAvailableExercises(filtered);
}

// ========================================
// GUARDAR CAMBIOS DE LA RUTINA
// ========================================

async function saveRoutine() {
    const nombre = document.getElementById('routineName').value.trim();
    const fecha = document.getElementById('routineDate').value;
    
    if (!nombre) {
        showMessage('El nombre de la rutina es obligatorio', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rutinas/${currentRoutineId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                nombre,
                fecha: fecha || null
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al guardar los cambios');
        }
        
        showMessage('Rutina actualizada exitosamente', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al guardar los cambios', 'error');
    }
}

// ========================================
// CANCELAR EDICIÓN
// ========================================

function cancelEdit() {
    if (confirm('¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.')) {
        window.location.href = 'dashboard.html';
    }
}

// ========================================
// MENSAJES
// ========================================

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}