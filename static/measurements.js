class MeasurementsPortal {
    constructor() {
        this.allMeasurements = [];
        this.filteredMeasurements = [];
        this.allContracts = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filtersCollapsed = false;
        this.currentMeasurement = null;
        this.editingMeasurement = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }

    initializeElements() {
        // Stats elements
        this.totalMeasurementsCard = document.getElementById("totalMeasurements");
        this.totalMeasuredValueCard = document.getElementById("totalMeasuredValue");
        this.pendingMeasurementsCard = document.getElementById("pendingMeasurements");
        this.approvedMeasurementsCard = document.getElementById("approvedMeasurements");
        this.avgMeasurementValueCard = document.getElementById("avgMeasurementValue");
        this.contractsWithMeasurementsCard = document.getElementById("contractsWithMeasurements");
        
        // Table elements
        this.measurementsTableBody = document.querySelector("#measurementsTable tbody");
        this.tableInfo = document.getElementById("tableInfo");
        
        // Filter elements
        this.contractFilter = document.getElementById("contractFilter");
        this.statusFilter = document.getElementById("statusFilter");
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.dateFromFilter = document.getElementById("dateFromFilter");
        this.dateToFilter = document.getElementById("dateToFilter");
        this.filtersContainer = document.getElementById("filtersContainer");
        
        // Button elements
        this.backButton = document.getElementById("backBtn");
        this.refreshButton = document.getElementById("refreshBtn");
        this.newMeasurementButton = document.getElementById("newMeasurementBtn");
        this.exportButton = document.getElementById("exportBtn");
        this.clearFiltersButton = document.getElementById("clearFilters");
        this.toggleFiltersButton = document.getElementById("toggleFilters");
        
        // Modal elements
        this.measurementModal = document.getElementById("measurementModal");
        this.measurementDetailsModal = document.getElementById("measurementDetailsModal");
        this.closeMeasurementModal = document.getElementById("closeMeasurementModal");
        this.closeMeasurementDetailsModal = document.getElementById("closeMeasurementDetailsModal");
        this.modalTitle = document.getElementById("modalTitle");
        this.measurementForm = document.getElementById("measurementForm");
        this.measurementDetailsContent = document.getElementById("measurementDetailsContent");
        
        // Form elements
        this.modalContractSelect = document.getElementById("modalContractSelect");
        this.modalMeasurementDate = document.getElementById("modalMeasurementDate");
        this.modalPeriodFrom = document.getElementById("modalPeriodFrom");
        this.modalPeriodTo = document.getElementById("modalPeriodTo");
        this.modalLaborValue = document.getElementById("modalLaborValue");
        this.modalMaterialValue = document.getElementById("modalMaterialValue");
        this.modalStatus = document.getElementById("modalStatus");
        this.modalTotalValue = document.getElementById("modalTotalValue");
        this.modalDescription = document.getElementById("modalDescription");
        this.cancelMeasurement = document.getElementById("cancelMeasurement");
        this.saveMeasurement = document.getElementById("saveMeasurement");
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
    }

    bindEvents() {
        // Navigation
        this.backButton.addEventListener("click", () => this.goBack());
        
        // Filter events
        this.contractFilter.addEventListener("change", () => this.applyFilters());
        this.statusFilter.addEventListener("change", () => this.applyFilters());
        this.companyFilter.addEventListener("change", () => this.applyFilters());
        this.supplierFilter.addEventListener("change", () => this.applyFilters());
        this.dateFromFilter.addEventListener("change", () => this.applyFilters());
        this.dateToFilter.addEventListener("change", () => this.applyFilters());
        
        // Button events
        this.refreshButton.addEventListener("click", () => this.loadData());
        this.newMeasurementButton.addEventListener("click", () => this.openNewMeasurementModal());
        this.exportButton.addEventListener("click", () => this.exportToCSV());
        this.clearFiltersButton.addEventListener("click", () => this.clearFilters());
        this.toggleFiltersButton.addEventListener("click", () => this.toggleFilters());
        
        // Table sorting events
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
        
        // Modal events
        this.closeMeasurementModal.addEventListener('click', () => this.closeModal());
        this.closeMeasurementDetailsModal.addEventListener('click', () => this.closeDetailsModal());
        this.measurementModal.addEventListener('click', (e) => {
            if (e.target === this.measurementModal) this.closeModal();
        });
        this.measurementDetailsModal.addEventListener('click', (e) => {
            if (e.target === this.measurementDetailsModal) this.closeDetailsModal();
        });
        
        // Form events
        this.measurementForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.cancelMeasurement.addEventListener('click', () => this.closeModal());
        this.modalLaborValue.addEventListener('input', () => this.updateTotalValue());
        this.modalMaterialValue.addEventListener('input', () => this.updateTotalValue());
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.measurementModal.classList.contains('show')) {
                    this.closeModal();
                }
                if (this.measurementDetailsModal.classList.contains('show')) {
                    this.closeDetailsModal();
                }
            }
        });
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    goBack() {
        window.location.href = '/';
    }

    async loadData() {
        this.showLoading();
        this.refreshButton.querySelector('i').classList.add('fa-spin');
        
        try {
            // Load contracts first
            const contractsResponse = await fetch("/api/contracts");
            if (!contractsResponse.ok) {
                throw new Error(`HTTP error! status: ${contractsResponse.status}`);
            }
            this.allContracts = await contractsResponse.json();
            
            // Load real measurements from API
            const measurementsResponse = await fetch("/api/measurements");
            if (!measurementsResponse.ok) {
                throw new Error(`HTTP error! status: ${measurementsResponse.status}`);
            }
            this.allMeasurements = await measurementsResponse.json();
            
            // Enrich measurements with contract data
            this.enrichMeasurementsWithContractData();
            
            this.populateFilters();
            this.populateContractSelect();
            this.applyFilters();
            this.showToast('Medições carregadas com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            this.measurementsTableBody.innerHTML = `
                <tr><td colspan="11" class="text-center">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar dados: ${error.message}
                </td></tr>
            `;
        } finally {
            this.hideLoading();
            this.refreshButton.querySelector('i').classList.remove('fa-spin');
        }
    }

    enrichMeasurementsWithContractData() {
        console.log(`🔍 Enriquecendo ${this.allMeasurements.length} medições com dados dos contratos...`);
        
        // Create a map of contracts for quick lookup
        const contractsMap = new Map();
        this.allContracts.forEach(contract => {
            contractsMap.set(contract.id, contract);
            contractsMap.set(contract.contractNumber, contract);
        });
        
        // Enrich measurements with contract data
        this.allMeasurements = this.allMeasurements.map(measurement => {
            // Try to find contract by different possible keys
            let contract = null;
            
            // Try by contractId first
            if (measurement.contractId) {
                contract = contractsMap.get(measurement.contractId);
            }
            
            // Try by supplyContractId
            if (!contract && measurement.supplyContractId) {
                contract = contractsMap.get(measurement.supplyContractId);
            }
            
            // Try by contractNumber
            if (!contract && measurement.contractNumber) {
                contract = contractsMap.get(measurement.contractNumber);
            }
            
            // If found contract, add company and supplier info
            if (contract) {
                return {
                    ...measurement,
                    contractNumber: contract.contractNumber,
                    companyName: contract.companyName,
                    supplierName: contract.supplierName,
                    // Ensure we have proper date formatting
                    measurementDate: measurement.measurementDate || measurement.createdAt || new Date().toISOString().split('T')[0],
                    periodFrom: measurement.periodFrom || measurement.startDate || '',
                    periodTo: measurement.periodTo || measurement.endDate || '',
                    // Calculate total value if not present
                    totalValue: measurement.totalValue || 
                               (parseFloat(measurement.totalLaborValue || 0) + parseFloat(measurement.totalMaterialValue || 0)),
                    // Ensure status is present
                    status: measurement.status || 'PENDING',
                    // Add description if not present
                    description: measurement.description || measurement.notes || `Medição do contrato ${contract.contractNumber}`
                };
            } else {
                console.warn(`⚠️ Contrato não encontrado para medição:`, measurement);
                return {
                    ...measurement,
                    companyName: 'N/A',
                    supplierName: 'N/A',
                    measurementDate: measurement.measurementDate || measurement.createdAt || new Date().toISOString().split('T')[0],
                    periodFrom: measurement.periodFrom || '',
                    periodTo: measurement.periodTo || '',
                    totalValue: measurement.totalValue || 
                               (parseFloat(measurement.totalLaborValue || 0) + parseFloat(measurement.totalMaterialValue || 0)),
                    status: measurement.status || 'PENDING',
                    description: measurement.description || 'Medição sem contrato associado'
                };
            }
        });
        
        // Sort by measurement date (newest first)
        this.allMeasurements.sort((a, b) => {
            const dateA = new Date(a.measurementDate);
            const dateB = new Date(b.measurementDate);
            return dateB - dateA;
        });
        
        console.log(`✅ Medições enriquecidas: ${this.allMeasurements.length}`);
    }

    populateFilters() {
        // Clear existing options (except first)
        [this.contractFilter, this.companyFilter, this.supplierFilter].forEach(select => {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        });

        // Populate contract filter
        const contracts = [...new Set(this.allMeasurements.map(m => m.contractNumber))].sort();
        contracts.forEach(contractNumber => {
            const option = document.createElement("option");
            option.value = contractNumber;
            option.textContent = `Contrato ${contractNumber}`;
            this.contractFilter.appendChild(option);
        });

        // Populate company filter
        const companies = [...new Set(this.allMeasurements.map(m => m.companyName))].sort();
        companies.forEach(company => {
            const option = document.createElement("option");
            option.value = company;
            option.textContent = company;
            this.companyFilter.appendChild(option);
        });

        // Populate supplier filter
        const suppliers = [...new Set(this.allMeasurements.map(m => m.supplierName))].sort();
        suppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
    }

    populateContractSelect() {
        // Clear existing options (except first)
        while (this.modalContractSelect.children.length > 1) {
            this.modalContractSelect.removeChild(this.modalContractSelect.lastChild);
        }

        // Populate with all contracts
        this.allContracts.forEach(contract => {
            const option = document.createElement("option");
            option.value = contract.contractNumber;
            option.textContent = `${contract.contractNumber} - ${contract.companyName} - ${contract.supplierName}`;
            option.dataset.contractId = contract.id;
            option.dataset.companyName = contract.companyName;
            option.dataset.supplierName = contract.supplierName;
            this.modalContractSelect.appendChild(option);
        });
    }

    applyFilters() {
        const selectedContract = this.contractFilter.value;
        const selectedStatus = this.statusFilter.value;
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const dateFrom = this.dateFromFilter.value;
        const dateTo = this.dateToFilter.value;

        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const matchesContract = selectedContract ? measurement.contractNumber === selectedContract : true;
            const matchesStatus = selectedStatus ? measurement.status === selectedStatus : true;
            const matchesCompany = selectedCompany ? measurement.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? measurement.supplierName === selectedSupplier : true;
            
            let matchesDateRange = true;
            if (dateFrom) {
                matchesDateRange = matchesDateRange && measurement.measurementDate >= dateFrom;
            }
            if (dateTo) {
                matchesDateRange = matchesDateRange && measurement.measurementDate <= dateTo;
            }
            
            return matchesContract && matchesStatus && matchesCompany && 
                   matchesSupplier && matchesDateRange;
        });

        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        this.measurementsTableBody.innerHTML = "";
        
        if (this.filteredMeasurements.length === 0) {
            this.measurementsTableBody.innerHTML = `
                <tr><td colspan="11" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhuma medição encontrada com os filtros aplicados.
                </td></tr>
            `;
            this.tableInfo.textContent = "Mostrando 0 medições";
            return;
        }

        this.filteredMeasurements.forEach(measurement => {
            const row = this.measurementsTableBody.insertRow();
            
            // ID
            row.insertCell().textContent = measurement.id;
            
            // Contract Number
            row.insertCell().textContent = measurement.contractNumber;
            
            // Company and Supplier
            row.insertCell().textContent = measurement.companyName;
            row.insertCell().textContent = measurement.supplierName;
            
            // Measurement Date
            const measurementDate = new Date(measurement.measurementDate);
            row.insertCell().textContent = measurementDate.toLocaleDateString('pt-BR');
            
            // Period
            const periodCell = row.insertCell();
            const periodFrom = new Date(measurement.periodFrom);
            const periodTo = new Date(measurement.periodTo);
            periodCell.innerHTML = `
                <div class="period-display">
                    ${periodFrom.toLocaleDateString('pt-BR')} até<br>
                    ${periodTo.toLocaleDateString('pt-BR')}
                </div>
            `;
            
            // Values
            const laborValue = parseFloat(measurement.totalLaborValue) || 0;
            const materialValue = parseFloat(measurement.totalMaterialValue) || 0;
            const totalValue = parseFloat(measurement.totalValue) || 0;
            
            const laborCell = row.insertCell();
            laborCell.className = 'value-cell';
            laborCell.textContent = laborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            const materialCell = row.insertCell();
            materialCell.className = 'value-cell';
            materialCell.textContent = materialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            const totalCell = row.insertCell();
            totalCell.className = 'value-cell';
            totalCell.textContent = totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Status
            const statusCell = row.insertCell();
            statusCell.innerHTML = `<span class="measurement-status ${measurement.status}">${this.getStatusText(measurement.status)}</span>`;
            
            // Actions
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="measurementsPortal.viewMeasurement(${measurement.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="measurementsPortal.editMeasurement(${measurement.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="measurementsPortal.deleteMeasurement(${measurement.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });

        this.tableInfo.textContent = `Mostrando ${this.filteredMeasurements.length} medições`;
    }

    getStatusText(status) {
        const statusMap = {
            'PENDING': 'Pendente',
            'APPROVED': 'Aprovada',
            'REJECTED': 'Rejeitada',
            'DRAFT': 'Rascunho'
        };
        return statusMap[status] || status;
    }

    updateStats() {
        const measurements = this.filteredMeasurements;
        
        // Total measurements
        this.totalMeasurementsCard.textContent = measurements.length;

        // Total measured value
        const totalMeasuredValue = measurements.reduce((sum, m) => sum + (parseFloat(m.totalValue) || 0), 0);
        this.totalMeasuredValueCard.textContent = totalMeasuredValue.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Pending measurements
        const pendingCount = measurements.filter(m => m.status === 'PENDING').length;
        this.pendingMeasurementsCard.textContent = pendingCount;

        // Approved measurements
        const approvedCount = measurements.filter(m => m.status === 'APPROVED').length;
        this.approvedMeasurementsCard.textContent = approvedCount;

        // Average measurement value
        const avgValue = measurements.length > 0 ? totalMeasuredValue / measurements.length : 0;
        this.avgMeasurementValueCard.textContent = avgValue.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Contracts with measurements
        const uniqueContracts = new Set(measurements.map(m => m.contractNumber));
        this.contractsWithMeasurementsCard.textContent = uniqueContracts.size;
    }

    sortTable(column) {
        // Update sort direction
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update UI
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentTh = document.querySelector(`th[data-sort="${column}"]`);
        currentTh.classList.add(`sort-${this.sortDirection}`);

        // Sort data
        this.filteredMeasurements.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle different data types
            if (column === 'measurementDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (column.includes('Value') || column === 'totalValue') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column === 'id') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable();
    }

    clearFilters() {
        this.contractFilter.value = "";
        this.statusFilter.value = "";
        this.companyFilter.value = "";
        this.supplierFilter.value = "";
        this.dateFromFilter.value = "";
        this.dateToFilter.value = "";
        
        this.applyFilters();
        this.showToast('Filtros limpos com sucesso!');
    }

    toggleFilters() {
        this.filtersCollapsed = !this.filtersCollapsed;
        
        if (this.filtersCollapsed) {
            this.filtersContainer.classList.add('collapsed');
            this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            this.filtersContainer.classList.remove('collapsed');
            this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }

    openNewMeasurementModal() {
        this.editingMeasurement = null;
        this.modalTitle.textContent = 'Nova Medição';
        this.resetForm();
        this.measurementModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    editMeasurement(id) {
        this.editingMeasurement = this.allMeasurements.find(m => m.id === id);
        if (!this.editingMeasurement) return;
        
        this.modalTitle.textContent = 'Editar Medição';
        this.populateForm(this.editingMeasurement);
        this.measurementModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    viewMeasurement(id) {
        const measurement = this.allMeasurements.find(m => m.id === id);
        if (!measurement) return;
        
        this.renderMeasurementDetails(measurement);
        this.measurementDetailsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    deleteMeasurement(id) {
        if (!confirm('Tem certeza que deseja excluir esta medição?')) return;
        
        // Remove from array (in real app, would call API)
        this.allMeasurements = this.allMeasurements.filter(m => m.id !== id);
        this.applyFilters();
        this.showToast('Medição excluída com sucesso!');
    }

    resetForm() {
        this.measurementForm.reset();
        this.modalMeasurementDate.value = new Date().toISOString().split('T')[0];
        this.modalStatus.value = 'DRAFT';
        this.updateTotalValue();
    }

    populateForm(measurement) {
        this.modalContractSelect.value = measurement.contractNumber;
        this.modalMeasurementDate.value = measurement.measurementDate;
        this.modalPeriodFrom.value = measurement.periodFrom;
        this.modalPeriodTo.value = measurement.periodTo;
        this.modalLaborValue.value = measurement.totalLaborValue;
        this.modalMaterialValue.value = measurement.totalMaterialValue;
        this.modalStatus.value = measurement.status;
        this.modalDescription.value = measurement.description;
        this.updateTotalValue();
    }

    updateTotalValue() {
        const laborValue = parseFloat(this.modalLaborValue.value) || 0;
        const materialValue = parseFloat(this.modalMaterialValue.value) || 0;
        this.modalTotalValue.value = laborValue + materialValue;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = {
            contractNumber: this.modalContractSelect.value,
            measurementDate: this.modalMeasurementDate.value,
            periodFrom: this.modalPeriodFrom.value,
            periodTo: this.modalPeriodTo.value,
            totalLaborValue: parseFloat(this.modalLaborValue.value) || 0,
            totalMaterialValue: parseFloat(this.modalMaterialValue.value) || 0,
            totalValue: parseFloat(this.modalTotalValue.value) || 0,
            status: this.modalStatus.value,
            description: this.modalDescription.value
        };

        // Get contract details
        const selectedOption = this.modalContractSelect.selectedOptions[0];
        if (selectedOption) {
            formData.contractId = selectedOption.dataset.contractId;
            formData.companyName = selectedOption.dataset.companyName;
            formData.supplierName = selectedOption.dataset.supplierName;
        }

        if (this.editingMeasurement) {
            // Update existing measurement
            const index = this.allMeasurements.findIndex(m => m.id === this.editingMeasurement.id);
            if (index !== -1) {
                this.allMeasurements[index] = {
                    ...this.allMeasurements[index],
                    ...formData,
                    updatedAt: new Date().toISOString()
                };
            }
            this.showToast('Medição atualizada com sucesso!');
        } else {
            // Create new measurement
            const newMeasurement = {
                id: Math.max(...this.allMeasurements.map(m => m.id), 0) + 1,
                ...formData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.allMeasurements.unshift(newMeasurement);
            this.showToast('Medição criada com sucesso!');
        }

        this.closeModal();
        this.applyFilters();
    }

    renderMeasurementDetails(measurement) {
        const measurementDate = new Date(measurement.measurementDate);
        const periodFrom = new Date(measurement.periodFrom);
        const periodTo = new Date(measurement.periodTo);
        const createdAt = new Date(measurement.createdAt);
        const updatedAt = new Date(measurement.updatedAt);

        this.measurementDetailsContent.innerHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Informações Gerais</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>ID da Medição</strong>
                        <span>${measurement.id}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Contrato</strong>
                        <span>${measurement.contractNumber}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Data da Medição</strong>
                        <span>${measurementDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Status</strong>
                        <span class="measurement-status ${measurement.status}">${this.getStatusText(measurement.status)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-building"></i> Contrato</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Empresa</strong>
                        <span>${measurement.companyName}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Fornecedor</strong>
                        <span>${measurement.supplierName}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-calendar-alt"></i> Período</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Data Inicial</strong>
                        <span>${periodFrom.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Data Final</strong>
                        <span>${periodTo.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-dollar-sign"></i> Valores</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Valor Mão de Obra</strong>
                        <span>${(parseFloat(measurement.totalLaborValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor Material</strong>
                        <span>${(parseFloat(measurement.totalMaterialValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor Total</strong>
                        <span style="font-weight: 600; color: var(--success-color);">${(parseFloat(measurement.totalValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                </div>
            </div>

            ${measurement.description ? `
                <div class="detail-section">
                    <h4><i class="fas fa-comment"></i> Descrição/Observações</h4>
                    <p style="margin: 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">${measurement.description}</p>
                </div>
            ` : ''}

            <div class="detail-section">
                <h4><i class="fas fa-clock"></i> Histórico</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Criado em</strong>
                        <span>${createdAt.toLocaleDateString('pt-BR')} às ${createdAt.toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Última atualização</strong>
                        <span>${updatedAt.toLocaleDateString('pt-BR')} às ${updatedAt.toLocaleTimeString('pt-BR')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    closeModal() {
        this.measurementModal.classList.remove('show');
        document.body.style.overflow = '';
        this.editingMeasurement = null;
    }

    closeDetailsModal() {
        this.measurementDetailsModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    exportToCSV() {
        if (this.filteredMeasurements.length === 0) {
            this.showToast('Nenhuma medição para exportar!', 'warning');
            return;
        }

        const headers = [
            'ID',
            'Contrato',
            'Empresa',
            'Fornecedor',
            'Data Medição',
            'Período De',
            'Período Até',
            'Valor M.O.',
            'Valor Material',
            'Valor Total',
            'Status',
            'Descrição'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredMeasurements.map(measurement => [
                measurement.id,
                `"${measurement.contractNumber}"`,
                `"${measurement.companyName}"`,
                `"${measurement.supplierName}"`,
                `"${new Date(measurement.measurementDate).toLocaleDateString('pt-BR')}"`,
                `"${new Date(measurement.periodFrom).toLocaleDateString('pt-BR')}"`,
                `"${new Date(measurement.periodTo).toLocaleDateString('pt-BR')}"`,
                parseFloat(measurement.totalLaborValue) || 0,
                parseFloat(measurement.totalMaterialValue) || 0,
                parseFloat(measurement.totalValue) || 0,
                `"${this.getStatusText(measurement.status)}"`,
                `"${measurement.description || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `medicoes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Arquivo CSV exportado com sucesso!');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});