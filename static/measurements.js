class MeasurementsPortal {
    constructor() {
        this.allMeasurements = [];
        this.filteredMeasurements = [];
        this.allContracts = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filtersCollapsed = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }

    initializeElements() {
        // Stats elements
        this.totalMeasurementsCard = document.getElementById("totalMeasurements");
        this.totalMeasuredValueCard = document.getElementById("totalMeasuredValue");
        this.totalRetentionCard = document.getElementById("totalRetention");
        this.totalLiquidCard = document.getElementById("totalLiquid");
        this.contractsWithMeasurementsCard = document.getElementById("contractsWithMeasurements");
        this.avgMeasurementValueCard = document.getElementById("avgMeasurementValue");
        
        // Table elements
        this.measurementsTableBody = document.querySelector("#measurementsTable tbody");
        this.tableInfo = document.getElementById("tableInfo");
        
        // Filter elements
        this.contractFilter = document.getElementById("contractFilter");
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.dateFromFilter = document.getElementById("dateFromFilter");
        this.dateToFilter = document.getElementById("dateToFilter");
        this.filtersContainer = document.getElementById("filtersContainer");
        
        // Button elements
        this.backButton = document.getElementById("backBtn");
        this.refreshButton = document.getElementById("refreshBtn");
        this.exportButton = document.getElementById("exportBtn");
        this.clearFiltersButton = document.getElementById("clearFilters");
        this.toggleFiltersButton = document.getElementById("toggleFilters");
        
        // Modal elements
        this.measurementDetailsModal = document.getElementById("measurementDetailsModal");
        this.closeMeasurementDetailsModal = document.getElementById("closeMeasurementDetailsModal");
        this.measurementDetailsContent = document.getElementById("measurementDetailsContent");
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
    }

    bindEvents() {
        // Navigation
        this.backButton.addEventListener("click", () => this.goBack());
        
        // Filter events
        this.contractFilter.addEventListener("change", () => this.applyFilters());
        this.companyFilter.addEventListener("change", () => this.applyFilters());
        this.supplierFilter.addEventListener("change", () => this.applyFilters());
        this.dateFromFilter.addEventListener("change", () => this.applyFilters());
        this.dateToFilter.addEventListener("change", () => this.applyFilters());
        
        // Button events
        this.refreshButton.addEventListener("click", () => this.loadData());
        this.exportButton.addEventListener("click", () => this.exportToCSV());
        this.clearFiltersButton.addEventListener("click", () => this.clearFilters());
        this.toggleFiltersButton.addEventListener("click", () => this.toggleFilters());
        
        // Table sorting events
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
        
        // Modal events
        this.closeMeasurementDetailsModal.addEventListener('click', () => this.closeDetailsModal());
        this.measurementDetailsModal.addEventListener('click', (e) => {
            if (e.target === this.measurementDetailsModal) this.closeDetailsModal();
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
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
            
            // Generate measurements data based on contracts
            this.generateMeasurementsFromContracts();
            
            this.populateFilters();
            this.applyFilters();
            this.showToast('Medições carregadas com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            this.measurementsTableBody.innerHTML = `
                <tr><td colspan="10" class="text-center">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar dados: ${error.message}
                </td></tr>
            `;
        } finally {
            this.hideLoading();
            this.refreshButton.querySelector('i').classList.remove('fa-spin');
        }
    }

    generateMeasurementsFromContracts() {
        this.allMeasurements = [];
        let measurementId = 1;
        
        // Generate measurements for contracts that have measured values
        this.allContracts.forEach(contract => {
            if (contract.valorMedido && contract.valorMedido > 0) {
                const numMeasurements = Math.floor(Math.random() * 8) + 5; // 5-12 measurements per contract
                
                for (let i = 0; i < numMeasurements; i++) {
                    const measurementDate = new Date();
                    measurementDate.setMonth(measurementDate.getMonth() - (numMeasurements - i - 1));
                    measurementDate.setDate(Math.floor(Math.random() * 28) + 1);
                    
                    const laborValue = (contract.valorMedido / numMeasurements) * (0.5 + Math.random() * 0.5);
                    const materialValue = (contract.valorMedido / numMeasurements) * (0.3 + Math.random() * 0.4);
                    const totalValue = laborValue + materialValue;
                    
                    // Calculate retention (5% of total value)
                    const retentionValue = totalValue * 0.05;
                    const liquidValue = totalValue - retentionValue;
                    
                    this.allMeasurements.push({
                        id: measurementId++,
                        measurementNumber: String(i + 1).padStart(3, '0'),
                        contractId: contract.id,
                        contractNumber: contract.contractNumber,
                        companyName: contract.companyName,
                        supplierName: contract.supplierName,
                        measurementDate: measurementDate.toISOString().split('T')[0],
                        period: this.formatPeriod(measurementDate),
                        type: 'MEDICAO',
                        totalLaborValue: laborValue,
                        totalMaterialValue: materialValue,
                        totalValue: totalValue,
                        retentionValue: retentionValue,
                        liquidValue: liquidValue,
                        description: `Medição ${i + 1} do contrato ${contract.contractNumber}`,
                        createdAt: measurementDate.toISOString(),
                        updatedAt: measurementDate.toISOString()
                    });
                }
            }
        });
        
        // Sort by measurement date (newest first)
        this.allMeasurements.sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate));
    }

    formatPeriod(date) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${month} de ${year}`;
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

    applyFilters() {
        const selectedContract = this.contractFilter.value;
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const dateFrom = this.dateFromFilter.value;
        const dateTo = this.dateToFilter.value;

        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const matchesContract = selectedContract ? measurement.contractNumber === selectedContract : true;
            const matchesCompany = selectedCompany ? measurement.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? measurement.supplierName === selectedSupplier : true;
            
            let matchesDateRange = true;
            if (dateFrom) {
                matchesDateRange = matchesDateRange && measurement.measurementDate >= dateFrom;
            }
            if (dateTo) {
                matchesDateRange = matchesDateRange && measurement.measurementDate <= dateTo;
            }
            
            return matchesContract && matchesCompany && matchesSupplier && matchesDateRange;
        });

        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        this.measurementsTableBody.innerHTML = "";
        
        if (this.filteredMeasurements.length === 0) {
            this.measurementsTableBody.innerHTML = `
                <tr><td colspan="10" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhuma medição encontrada com os filtros aplicados.
                </td></tr>
            `;
            this.tableInfo.textContent = "Mostrando 0 medições";
            return;
        }

        this.filteredMeasurements.forEach(measurement => {
            const row = this.measurementsTableBody.insertRow();
            
            // Data
            const measurementDate = new Date(measurement.measurementDate);
            row.insertCell().textContent = measurementDate.toLocaleDateString('pt-BR');
            
            // Nº Medição
            row.insertCell().textContent = measurement.measurementNumber;
            
            // Período
            row.insertCell().textContent = measurement.period || '-';
            
            // Tipo
            const typeCell = row.insertCell();
            typeCell.innerHTML = `<span class="measurement-type">${measurement.type}</span>`;
            
            // Valor
            const totalValue = parseFloat(measurement.totalValue) || 0;
            const totalCell = row.insertCell();
            totalCell.className = 'value-cell';
            totalCell.textContent = totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Mão de Obra
            const laborValue = parseFloat(measurement.totalLaborValue) || 0;
            const laborCell = row.insertCell();
            laborCell.className = 'value-cell';
            laborCell.textContent = laborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Material
            const materialValue = parseFloat(measurement.totalMaterialValue) || 0;
            const materialCell = row.insertCell();
            materialCell.className = 'value-cell';
            materialCell.textContent = materialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Caução
            const retentionValue = parseFloat(measurement.retentionValue) || 0;
            const retentionCell = row.insertCell();
            retentionCell.className = 'value-cell retention';
            retentionCell.textContent = retentionValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Valor Líquido
            const liquidValue = parseFloat(measurement.liquidValue) || 0;
            const liquidCell = row.insertCell();
            liquidCell.className = 'value-cell liquid';
            liquidCell.textContent = liquidValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Ações
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

    updateStats() {
        const measurements = this.filteredMeasurements;
        
        // Total measurements
        this.totalMeasurementsCard.textContent = measurements.length;

        // Total measured value
        const totalMeasuredValue = measurements.reduce((sum, m) => sum + (parseFloat(m.totalValue) || 0), 0);
        this.totalMeasuredValueCard.textContent = totalMeasuredValue.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Total retention
        const totalRetention = measurements.reduce((sum, m) => sum + (parseFloat(m.retentionValue) || 0), 0);
        this.totalRetentionCard.textContent = totalRetention.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Total liquid
        const totalLiquid = measurements.reduce((sum, m) => sum + (parseFloat(m.liquidValue) || 0), 0);
        this.totalLiquidCard.textContent = totalLiquid.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

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
            } else if (column === 'measurementNumber') {
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

    viewMeasurement(id) {
        const measurement = this.allMeasurements.find(m => m.id === id);
        if (!measurement) return;
        
        this.renderMeasurementDetails(measurement);
        this.measurementDetailsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    editMeasurement(id) {
        this.showToast('Funcionalidade de edição não disponível - apenas visualização', 'warning');
    }

    deleteMeasurement(id) {
        this.showToast('Funcionalidade de exclusão não disponível - apenas visualização', 'warning');
    }

    renderMeasurementDetails(measurement) {
        const measurementDate = new Date(measurement.measurementDate);
        const createdAt = new Date(measurement.createdAt);
        const updatedAt = new Date(measurement.updatedAt);

        this.measurementDetailsContent.innerHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Informações Gerais</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Nº da Medição</strong>
                        <span>${measurement.measurementNumber}</span>
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
                        <strong>Período</strong>
                        <span>${measurement.period}</span>
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
                        <span style="font-weight: 600; color: var(--primary-color);">${(parseFloat(measurement.totalValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Caução (5%)</strong>
                        <span style="font-weight: 600; color: var(--danger-color);">${(parseFloat(measurement.retentionValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor Líquido</strong>
                        <span style="font-weight: 600; color: var(--success-color);">${(parseFloat(measurement.liquidValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
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
            'Data',
            'Nº Medição',
            'Período',
            'Tipo',
            'Contrato',
            'Empresa',
            'Fornecedor',
            'Valor',
            'Mão de Obra',
            'Material',
            'Caução',
            'Valor Líquido'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredMeasurements.map(measurement => [
                `"${new Date(measurement.measurementDate).toLocaleDateString('pt-BR')}"`,
                `"${measurement.measurementNumber}"`,
                `"${measurement.period || ''}"`,
                `"${measurement.type}"`,
                `"${measurement.contractNumber}"`,
                `"${measurement.companyName}"`,
                `"${measurement.supplierName}"`,
                parseFloat(measurement.totalValue) || 0,
                parseFloat(measurement.totalLaborValue) || 0,
                parseFloat(measurement.totalMaterialValue) || 0,
                parseFloat(measurement.retentionValue) || 0,
                parseFloat(measurement.liquidValue) || 0
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