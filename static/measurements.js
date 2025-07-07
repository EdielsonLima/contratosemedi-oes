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
        this.measurementsBody = document.getElementById("measurementsBody");
        this.tableInfo = document.getElementById("tableInfo");
        
        // Filter elements
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.contractFilter = document.getElementById("contractFilter");
        this.dateFromFilter = document.getElementById("dateFromFilter");
        this.dateToFilter = document.getElementById("dateToFilter");
        this.filtersContainer = document.getElementById("filtersContainer");
        
        // Button elements
        this.clearFiltersButton = document.getElementById("clearFilters");
        this.refreshButton = document.getElementById("refreshBtn");
        this.exportButton = document.getElementById("exportBtn");
        this.toggleFiltersButton = document.getElementById("toggleFilters");
        this.backButton = document.getElementById("backBtn");
        
        // Modal elements
        this.measurementDetailsModal = document.getElementById("measurementDetailsModal");
        this.closeMeasurementDetailsModal = document.getElementById("closeMeasurementDetailsModal");
        this.measurementDetailsContent = document.getElementById("measurementDetailsContent");
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
    }

    bindEvents() {
        // Filter events
        this.companyFilter.addEventListener("change", () => this.applyFilters());
        this.supplierFilter.addEventListener("change", () => this.applyFilters());
        this.contractFilter.addEventListener("change", () => this.applyFilters());
        this.dateFromFilter.addEventListener("change", () => this.applyFilters());
        this.dateToFilter.addEventListener("change", () => this.applyFilters());
        
        // Button events
        this.clearFiltersButton.addEventListener("click", () => this.clearFilters());
        this.refreshButton.addEventListener("click", () => this.loadData());
        this.exportButton.addEventListener("click", () => this.exportToCSV());
        this.toggleFiltersButton.addEventListener("click", () => this.toggleFilters());
        this.backButton.addEventListener("click", () => this.goBack());
        
        // Table sorting events
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
        });
        
        // Modal events
        if (this.closeMeasurementDetailsModal) {
            this.closeMeasurementDetailsModal.addEventListener('click', () => this.closeModal());
        }
        if (this.measurementDetailsModal) {
            this.measurementDetailsModal.addEventListener('click', (e) => {
                if (e.target === this.measurementDetailsModal) this.closeModal();
            });
        }
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.measurementDetailsModal && this.measurementDetailsModal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('show');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('show');
        }
    }

    showToast(message, type = 'success') {
        if (!this.toastContainer) return;
        
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

    async loadData() {
        this.showLoading();
        if (this.refreshButton) {
            this.refreshButton.querySelector('i').classList.add('fa-spin');
        }
        
        try {
            console.log('🔄 Carregando dados de medições...');
            
            // Carregar contratos primeiro
            const contractsResponse = await fetch("/api/contracts");
            if (!contractsResponse.ok) {
                throw new Error(`Erro ao carregar contratos: ${contractsResponse.status}`);
            }
            this.allContracts = await contractsResponse.json();
            console.log(`📋 Contratos carregados: ${this.allContracts.length}`);
            
            // Carregar medições
            const measurementsResponse = await fetch("/api/measurements");
            if (!measurementsResponse.ok) {
                throw new Error(`Erro ao carregar medições: ${measurementsResponse.status}`);
            }
            const rawMeasurements = await measurementsResponse.json();
            console.log(`📊 Medições brutas carregadas: ${rawMeasurements.length}`);
            
            // Processar medições
            this.allMeasurements = this.processMeasurements(rawMeasurements);
            console.log(`✅ Medições processadas: ${this.allMeasurements.length}`);
            
            this.populateFilters();
            this.applyFilters();
            this.showToast('Medições carregadas com sucesso!');
            
        } catch (error) {
            console.error("❌ Erro ao carregar dados:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            if (this.measurementsBody) {
                this.measurementsBody.innerHTML = `
                    <tr><td colspan="10" class="text-center">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Erro ao carregar dados: ${error.message}
                    </td></tr>
                `;
            }
        } finally {
            this.hideLoading();
            if (this.refreshButton) {
                this.refreshButton.querySelector('i').classList.remove('fa-spin');
            }
        }
    }

    processMeasurements(measurements) {
        console.log('🔧 Processando medições da API...');
        
        return measurements.map((measurement, index) => {
            // Encontrar contrato correspondente
            const contract = this.allContracts.find(c => 
                c.id === measurement.contractId || 
                c.contractId === measurement.contractId ||
                c.id === measurement.supplyContractId ||
                c.contractId === measurement.supplyContractId ||
                c.contractNumber === measurement.contractNumber
            );
            
            // Valores básicos
            const laborValue = parseFloat(measurement.totalLaborValue || 0);
            const materialValue = parseFloat(measurement.totalMaterialValue || 0);
            const totalValue = laborValue + materialValue;
            
            // Calcular caução/retenção
            let retentionValue = 0;
            if (measurement.securityDepositValue) {
                retentionValue = parseFloat(measurement.securityDepositValue);
            } else if (contract && contract.securityDeposit) {
                const percentage = parseFloat(contract.securityDeposit.securityDepositPercentage || 0);
                if (percentage > 0) {
                    retentionValue = (totalValue * percentage) / 100;
                }
            }
            
            const liquidValue = totalValue - retentionValue;
            
            // Dados do contrato
            const contractNumber = contract?.contractNumber || measurement.contractNumber || `C${measurement.contractId || index + 1}`;
            const companyName = contract?.companyName || 'Empresa não encontrada';
            const supplierName = contract?.supplierName || 'Fornecedor não encontrado';
            
            // Data da medição
            const measurementDate = measurement.measurementDate || measurement.createdAt || new Date().toISOString();
            const formattedDate = new Date(measurementDate);
            
            return {
                id: measurement.id || index + 1,
                measurementNumber: String(measurement.measurementNumber || measurement.id || index + 1).padStart(3, '0'),
                contractId: measurement.contractId || measurement.supplyContractId,
                contractNumber: contractNumber,
                companyName: companyName,
                supplierName: supplierName,
                measurementDate: formattedDate.toISOString().split('T')[0],
                period: this.formatPeriod(formattedDate),
                type: 'MEDICAO',
                totalLaborValue: laborValue,
                totalMaterialValue: materialValue,
                totalValue: totalValue,
                retentionValue: retentionValue,
                liquidValue: liquidValue,
                description: measurement.description || measurement.note || `Medição ${measurement.measurementNumber || index + 1}`,
                createdAt: measurement.createdAt || measurementDate,
                updatedAt: measurement.updatedAt || measurementDate,
                originalData: measurement,
                hasValidContract: !!contract
            };
        });
    }

    formatPeriod(date) {
        const months = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        return `${months[date.getMonth()]}/${date.getFullYear()}`;
    }

    populateFilters() {
        console.log('🔧 Populando filtros...');
        console.log(`📊 Total de contratos disponíveis: ${this.allContracts.length}`);
        console.log(`📊 Total de medições processadas: ${this.allMeasurements.length}`);
        
        // Clear existing options (except first)
        [this.companyFilter, this.supplierFilter, this.contractFilter].forEach(select => {
            if (select) {
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
            }
        });

        // Populate company filter - usar TODOS os contratos, não apenas os com medições
        const companies = [...new Set(this.allContracts.map(c => c.companyName))].filter(Boolean).sort();
        console.log(`🏢 Empresas encontradas: ${companies.length}`, companies);
        companies.forEach(company => {
            if (this.companyFilter) {
                const option = document.createElement("option");
                option.value = company;
                option.textContent = company;
                this.companyFilter.appendChild(option);
            }
        });

        // Populate supplier filter - usar TODOS os contratos, não apenas os com medições
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].filter(Boolean).sort();
        console.log(`🚚 Fornecedores encontrados: ${suppliers.length}`, suppliers);
        suppliers.forEach(supplier => {
            if (this.supplierFilter) {
                const option = document.createElement("option");
                option.value = supplier;
                option.textContent = supplier;
                this.supplierFilter.appendChild(option);
            }
        });

        // Populate contract filter - usar TODOS os contratos, não apenas os com medições
        const contracts = [...new Set(this.allContracts.map(c => c.contractNumber))].filter(Boolean).sort();
        console.log(`📋 Contratos encontrados: ${contracts.length}`, contracts);
        contracts.forEach(contract => {
            if (this.contractFilter) {
                const option = document.createElement("option");
                option.value = contract;
                option.textContent = `Contrato ${contract}`;
                this.contractFilter.appendChild(option);
            }
        });
    }

    applyFilters() {
        console.log('🔍 Aplicando filtros...');
        const selectedCompany = this.companyFilter?.value || '';
        const selectedSupplier = this.supplierFilter?.value || '';
        const selectedContract = this.contractFilter?.value || '';
        const dateFrom = this.dateFromFilter?.value || '';
        const dateTo = this.dateToFilter?.value || '';
        
        console.log('📋 Filtros selecionados:', {
            empresa: selectedCompany,
            fornecedor: selectedSupplier,
            contrato: selectedContract,
            dataInicio: dateFrom,
            dataFim: dateTo
        });

        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const matchesCompany = selectedCompany ? measurement.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? measurement.supplierName === selectedSupplier : true;
            const matchesContract = selectedContract ? measurement.contractNumber === selectedContract : true;
            
            let matchesDateRange = true;
            if (dateFrom || dateTo) {
                const measurementDate = new Date(measurement.measurementDate);
                if (dateFrom) {
                    matchesDateRange = matchesDateRange && measurementDate >= new Date(dateFrom);
                }
                if (dateTo) {
                    matchesDateRange = matchesDateRange && measurementDate <= new Date(dateTo);
                }
            }
            
            const matches = matchesCompany && matchesSupplier && matchesContract && matchesDateRange;
            
            // Debug para as primeiras medições
            if (this.allMeasurements.indexOf(measurement) < 3) {
                console.log(`🔍 Medição ${measurement.measurementNumber}:`, {
                    empresa: measurement.companyName,
                    fornecedor: measurement.supplierName,
                    contrato: measurement.contractNumber,
                    matchesCompany,
                    matchesSupplier,
                    matchesContract,
                    matchesDateRange,
                    resultado: matches
                });
            }
            
            return matches;
        });
        
        console.log(`✅ Medições filtradas: ${this.filteredMeasurements.length} de ${this.allMeasurements.length}`);

        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        if (!this.measurementsBody) return;
        
        this.measurementsBody.innerHTML = "";
        
        if (this.filteredMeasurements.length === 0) {
            this.measurementsBody.innerHTML = `
                <tr><td colspan="10" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhuma medição encontrada com os filtros aplicados.
                </td></tr>
            `;
            if (this.tableInfo) {
                this.tableInfo.textContent = "Mostrando 0 medições";
            }
            return;
        }

        this.filteredMeasurements.forEach(measurement => {
            const row = this.measurementsBody.insertRow();
            
            // Data
            const dateCell = row.insertCell();
            dateCell.textContent = new Date(measurement.measurementDate).toLocaleDateString('pt-BR');
            
            // Número da Medição
            const numberCell = row.insertCell();
            numberCell.textContent = measurement.measurementNumber;
            
            // Período
            const periodCell = row.insertCell();
            periodCell.innerHTML = `<span class="period-display">${measurement.period}</span>`;
            
            // Tipo
            const typeCell = row.insertCell();
            typeCell.innerHTML = `<span class="measurement-type">${measurement.type}</span>`;
            
            // Valor Total
            const valueCell = row.insertCell();
            valueCell.className = 'value-cell';
            valueCell.textContent = measurement.totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Mão de Obra
            const laborCell = row.insertCell();
            laborCell.className = 'value-cell';
            laborCell.textContent = measurement.totalLaborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Material
            const materialCell = row.insertCell();
            materialCell.className = 'value-cell';
            materialCell.textContent = measurement.totalMaterialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Caução
            const retentionCell = row.insertCell();
            retentionCell.className = 'value-cell retention';
            retentionCell.textContent = measurement.retentionValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Valor Líquido
            const liquidCell = row.insertCell();
            liquidCell.className = 'value-cell liquid';
            liquidCell.textContent = measurement.liquidValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            
            // Ações
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="measurementsPortal.showMeasurementDetails('${measurement.id}')" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;
        });

        if (this.tableInfo) {
            this.tableInfo.textContent = `Mostrando ${this.filteredMeasurements.length} medições`;
        }
    }

    updateStats() {
        const measurements = this.filteredMeasurements;
        
        // Total de medições
        if (this.totalMeasurementsCard) {
            this.totalMeasurementsCard.textContent = measurements.length;
        }

        // Valor total medido
        const totalMeasuredValue = measurements.reduce((sum, m) => sum + m.totalValue, 0);
        if (this.totalMeasuredValueCard) {
            this.totalMeasuredValueCard.textContent = totalMeasuredValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Total de caução
        const totalRetention = measurements.reduce((sum, m) => sum + m.retentionValue, 0);
        if (this.totalRetentionCard) {
            this.totalRetentionCard.textContent = totalRetention.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Total líquido
        const totalLiquid = measurements.reduce((sum, m) => sum + m.liquidValue, 0);
        if (this.totalLiquidCard) {
            this.totalLiquidCard.textContent = totalLiquid.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Contratos com medições
        const uniqueContracts = new Set(measurements.map(m => m.contractNumber));
        if (this.contractsWithMeasurementsCard) {
            this.contractsWithMeasurementsCard.textContent = uniqueContracts.size;
        }

        // Valor médio
        const avgValue = measurements.length > 0 ? totalMeasuredValue / measurements.length : 0;
        if (this.avgMeasurementValueCard) {
            this.avgMeasurementValueCard.textContent = avgValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }
    }

    showMeasurementDetails(measurementId) {
        const measurement = this.filteredMeasurements.find(m => m.id == measurementId);
        if (!measurement || !this.measurementDetailsModal || !this.measurementDetailsContent) return;
        
        this.measurementDetailsContent.innerHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Informações Básicas</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Número da Medição</strong>
                        <span>${measurement.measurementNumber}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Contrato</strong>
                        <span>${measurement.contractNumber}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Data</strong>
                        <span>${new Date(measurement.measurementDate).toLocaleDateString('pt-BR')}</span>
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
                        <strong>Mão de Obra</strong>
                        <span>${measurement.totalLaborValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Material</strong>
                        <span>${measurement.totalMaterialValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor Total</strong>
                        <span>${measurement.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Caução/Retenção</strong>
                        <span>${measurement.retentionValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor Líquido</strong>
                        <span>${measurement.liquidValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                </div>
            </div>
        `;
        
        this.measurementDetailsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        if (this.measurementDetailsModal) {
            this.measurementDetailsModal.classList.remove('show');
            document.body.style.overflow = '';
        }
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
        if (currentTh) {
            currentTh.classList.add(`sort-${this.sortDirection}`);
        }

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
        if (this.companyFilter) this.companyFilter.value = "";
        if (this.supplierFilter) this.supplierFilter.value = "";
        if (this.contractFilter) this.contractFilter.value = "";
        if (this.dateFromFilter) this.dateFromFilter.value = "";
        if (this.dateToFilter) this.dateToFilter.value = "";
        
        this.applyFilters();
        this.showToast('Filtros limpos com sucesso!');
    }

    toggleFilters() {
        this.filtersCollapsed = !this.filtersCollapsed;
        
        if (this.filtersContainer && this.toggleFiltersButton) {
            if (this.filtersCollapsed) {
                this.filtersContainer.classList.add('collapsed');
                this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                this.filtersContainer.classList.remove('collapsed');
                this.toggleFiltersButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
        }
    }

    exportToCSV() {
        if (this.filteredMeasurements.length === 0) {
            this.showToast('Nenhuma medição para exportar!', 'warning');
            return;
        }

        const headers = [
            'Data',
            'Nº Medição',
            'Contrato',
            'Empresa',
            'Fornecedor',
            'Período',
            'Tipo',
            'Valor Total',
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
                `"${measurement.contractNumber}"`,
                `"${measurement.companyName}"`,
                `"${measurement.supplierName}"`,
                `"${measurement.period}"`,
                `"${measurement.type}"`,
                measurement.totalValue,
                measurement.totalLaborValue,
                measurement.totalMaterialValue,
                measurement.retentionValue,
                measurement.liquidValue
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

    goBack() {
        window.location.href = '/';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});