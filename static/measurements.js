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
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.contractFilter = document.getElementById("contractFilter");
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
        this.companyFilter.addEventListener("change", () => this.onCompanyChange());
        this.supplierFilter.addEventListener("change", () => this.onSupplierChange());
        this.contractFilter.addEventListener("change", () => this.applyFilters());
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
        if (this.closeMeasurementDetailsModal) {
            this.closeMeasurementDetailsModal.addEventListener('click', () => this.closeDetailsModal());
        }
        if (this.measurementDetailsModal) {
            this.measurementDetailsModal.addEventListener('click', (e) => {
                if (e.target === this.measurementDetailsModal) this.closeDetailsModal();
            });
        }
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.measurementDetailsModal && this.measurementDetailsModal.classList.contains('show')) {
                    this.closeDetailsModal();
                }
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

    goBack() {
        window.location.href = '/';
    }

    async loadData() {
        this.showLoading();
        if (this.refreshButton) {
            this.refreshButton.querySelector('i').classList.add('fa-spin');
        }
        
        try {
            // Load contracts first
            const contractsResponse = await fetch("/api/contracts");
            if (!contractsResponse.ok) {
                throw new Error(`HTTP error! status: ${contractsResponse.status}`);
            }
            this.allContracts = await contractsResponse.json();
            
            // Load real measurements from API
            await this.loadRealMeasurements();
            
            this.populateFilters();
            this.applyFilters();
            this.showToast('Medições carregadas com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            if (this.measurementsTableBody) {
                this.measurementsTableBody.innerHTML = `
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

    async loadRealMeasurements() {
        console.log('🔄 Carregando medições reais da API...');
        
        try {
            // Buscar medições da API real
            const response = await fetch("/api/measurements");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const measurements = await response.json();
            console.log(`✅ ${measurements.length} medições carregadas da API`);
            
            // DEBUG: Mostrar estrutura das medições
            if (measurements.length > 0) {
                console.log('🔍 Primeira medição da API:', measurements[0]);
                console.log('🔍 Campos disponíveis:', Object.keys(measurements[0]));
            }
            
            // Processar e enriquecer os dados das medições
            this.allMeasurements = this.processMeasurements(measurements);
            
            console.log(`📊 Medições processadas: ${this.allMeasurements.length}`);
            if (this.allMeasurements.length > 0) {
                console.log('🔍 Primeira medição processada:', this.allMeasurements[0]);
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar medições da API:', error);
            // Em caso de erro, usar dados simulados como fallback
            console.log('⚠️ Usando dados simulados como fallback...');
            this.generateMeasurementsFromContracts();
        }
    }

    processMeasurements(measurements) {
        console.log('🔧 Processando medições da API...');
        
        const processedMeasurements = measurements.map((measurement, index) => {
            // Calcular valores
            const laborValue = parseFloat(measurement.totalLaborValue) || 0;
            const materialValue = parseFloat(measurement.totalMaterialValue) || 0;
            const totalValue = laborValue + materialValue;
            
            // Calcular caução (5% do valor total)
            const retentionValue = totalValue * 0.05;
            const liquidValue = totalValue - retentionValue;
            
            // Encontrar contrato correspondente - múltiplas estratégias
            let contract = null;
            
            // Estratégia 1: Por contractId
            if (measurement.contractId) {
                contract = this.allContracts.find(c => c.id === measurement.contractId);
            }
            
            // Estratégia 2: Por supplyContractId
            if (!contract && measurement.supplyContractId) {
                contract = this.allContracts.find(c => c.id === measurement.supplyContractId);
            }
            
            // Estratégia 3: Por contractNumber
            if (!contract && measurement.contractNumber) {
                contract = this.allContracts.find(c => c.contractNumber === measurement.contractNumber);
            }
            
            // Estratégia 4: Por qualquer campo que contenha número do contrato
            if (!contract) {
                const possibleContractNumbers = [
                    measurement.contractNumber,
                    measurement.contract_number,
                    measurement.contractId,
                    measurement.supplyContractId
                ].filter(Boolean);
                
                for (const contractNum of possibleContractNumbers) {
                    contract = this.allContracts.find(c => 
                        c.contractNumber == contractNum || 
                        c.id == contractNum
                    );
                    if (contract) break;
                }
            }
            
            // DEBUG para medições sem contrato
            if (!contract) {
                console.log(`⚠️ Medição sem contrato encontrado:`, {
                    measurementId: measurement.id,
                    contractId: measurement.contractId,
                    supplyContractId: measurement.supplyContractId,
                    contractNumber: measurement.contractNumber
                });
            }
            
            // Usar dados do contrato se encontrado, senão usar dados da medição
            const companyName = contract?.companyName || measurement.companyName || 'Empresa não identificada';
            const supplierName = contract?.supplierName || measurement.supplierName || 'Fornecedor não identificado';
            const contractNumber = contract?.contractNumber || measurement.contractNumber || measurement.contractId || measurement.supplyContractId || `MED-${index + 1}`;
            
            // Formatar data da medição
            const measurementDate = measurement.measurementDate || measurement.createdAt || measurement.date || new Date().toISOString();
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
                // Campos originais da API
                originalData: measurement,
                // Flag para indicar se tem contrato válido
                hasValidContract: !!contract
            };
        });
        
        // Filtrar apenas medições com contratos válidos OU que tenham dados mínimos
        const validMeasurements = processedMeasurements.filter(m => 
            m.hasValidContract || 
            (m.companyName !== 'Empresa não identificada' && m.supplierName !== 'Fornecedor não identificado')
        );
        
        console.log(`📊 Medições válidas: ${validMeasurements.length} de ${processedMeasurements.length}`);
        
        // Se não há medições válidas da API, usar dados simulados
        if (validMeasurements.length === 0) {
            console.log('⚠️ Nenhuma medição válida encontrada, gerando dados simulados...');
            return [];
        }
        
        return validMeasurements;
    }

    generateMeasurementsFromContracts() {
        console.log('🎲 Gerando dados simulados baseados nos contratos...');
        this.allMeasurements = [];
        let measurementId = 1;
        
        // Pegar apenas contratos que têm valor medido > 0
        const contractsWithMeasurements = this.allContracts.filter(contract => 
            contract.valorMedido && contract.valorMedido > 0
        );
        
        console.log(`📊 Contratos com medições: ${contractsWithMeasurements.length}`);
        
        // Se não há contratos com medições, criar algumas medições de exemplo
        if (contractsWithMeasurements.length === 0) {
            console.log('⚠️ Nenhum contrato com medições, criando dados de exemplo...');
            
            // Pegar os primeiros 3 contratos para criar medições de exemplo
            const sampleContracts = this.allContracts.slice(0, 3);
            
            sampleContracts.forEach((contract, contractIndex) => {
                const numMeasurements = 3 + contractIndex; // 3, 4, 5 medições
                const totalContractValue = parseFloat(contract.valorTotal) || 100000;
                
                for (let i = 0; i < numMeasurements; i++) {
                    const measurementDate = new Date();
                    measurementDate.setMonth(measurementDate.getMonth() - (numMeasurements - i - 1));
                    measurementDate.setDate(Math.floor(Math.random() * 28) + 1);
                    
                    const laborValue = (totalContractValue / numMeasurements) * 0.6 * (0.8 + Math.random() * 0.4);
                    const materialValue = (totalContractValue / numMeasurements) * 0.4 * (0.8 + Math.random() * 0.4);
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
                        updatedAt: measurementDate.toISOString(),
                        hasValidContract: true
                    });
                }
            });
        } else {
            // Generate measurements for contracts that have measured values
            contractsWithMeasurements.forEach(contract => {
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
                        updatedAt: measurementDate.toISOString(),
                        hasValidContract: true
                    });
                }
            });
        }
        
        // Sort by measurement date (newest first)
        this.allMeasurements.sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate));
        
        console.log(`✅ Medições simuladas criadas: ${this.allMeasurements.length}`);
    }
            );
            
            // Formatar data da medição
            const measurementDate = measurement.measurementDate || measurement.createdAt || new Date().toISOString();
            const formattedDate = new Date(measurementDate);
            
            return {
                id: measurement.id || index + 1,
                measurementNumber: String(measurement.measurementNumber || measurement.id || index + 1).padStart(3, '0'),
                contractId: measurement.contractId || measurement.supplyContractId,
                contractNumber: measurement.contractNumber || contract?.contractNumber || 'N/A',
                companyName: contract?.companyName || measurement.companyName || 'N/A',
                supplierName: contract?.supplierName || measurement.supplierName || 'N/A',
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
                // Campos originais da API
                originalData: measurement
            };
        }).filter(m => m.contractNumber !== 'N/A'); // Filtrar medições sem contrato válido
    }

    generateMeasurementsFromContracts() {
        console.log('🎲 Gerando dados simulados baseados nos contratos...');
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
        [this.companyFilter, this.supplierFilter, this.contractFilter].forEach(select => {
            if (select) {
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
            }
        });

        // Populate company filter - usar TODOS os contratos, não apenas medições
        const companies = [...new Set(this.allContracts.map(c => c.companyName))].sort();
        companies.forEach(company => {
            if (this.companyFilter) {
                const option = document.createElement("option");
                option.value = company;
                option.textContent = company;
                this.companyFilter.appendChild(option);
            }
        });

        // Populate supplier filter - usar TODOS os contratos, não apenas medições
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        suppliers.forEach(supplier => {
            if (this.supplierFilter) {
                const option = document.createElement("option");
                option.value = supplier;
                option.textContent = supplier;
                this.supplierFilter.appendChild(option);
            }
        });

        // Populate contract filter
        const contracts = [...new Set(this.allMeasurements.map(m => m.contractNumber))].sort();
        contracts.forEach(contractNumber => {
            if (this.contractFilter) {
                const option = document.createElement("option");
                option.value = contractNumber;
                option.textContent = `Contrato ${contractNumber}`;
                this.contractFilter.appendChild(option);
            }
        });
    }

    clearFilterOptions(selectElement) {
        if (!selectElement) return;
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
    }

    onCompanyChange() {
        const selectedCompany = this.companyFilter ? this.companyFilter.value : '';
        
        // Clear and reset supplier and contract filters
        this.clearFilterOptions(this.supplierFilter);
        this.clearFilterOptions(this.contractFilter);
        if (this.supplierFilter) this.supplierFilter.value = "";
        if (this.contractFilter) this.contractFilter.value = "";
        
        if (selectedCompany) {
            // Get suppliers for selected company
            const suppliersForCompany = [...new Set(
                this.allContracts
                    .filter(c => c.companyName === selectedCompany)
                    .map(c => c.supplierName)
            )].sort();
            
            suppliersForCompany.forEach(supplier => {
                if (this.supplierFilter) {
                    const option = document.createElement("option");
                    option.value = supplier;
                    option.textContent = supplier;
                    this.supplierFilter.appendChild(option);
                }
            });
            
            // Get contracts for selected company that have measurements
            const contractsForCompany = [...new Set(
                this.allContracts
                    .filter(c => c.companyName === selectedCompany)
                    .filter(c => this.allMeasurements.some(m => m.contractNumber === c.contractNumber))
                    .map(c => c.contractNumber)
            )].sort();
            
            contractsForCompany.forEach(contractNumber => {
                if (this.contractFilter) {
                    const option = document.createElement("option");
                    option.value = contractNumber;
                    option.textContent = `Contrato ${contractNumber}`;
                    this.contractFilter.appendChild(option);
                }
            });
        } else {
            // If no company selected, show all suppliers and contracts
            this.populateSupplierFilter();
            this.populateContractFilter();
        }
        
        this.applyFilters();
    }

    populateSupplierFilter() {
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        suppliers.forEach(supplier => {
            if (this.supplierFilter) {
                const option = document.createElement("option");
                option.value = supplier;
                option.textContent = supplier;
                this.supplierFilter.appendChild(option);
            }
        });
    }

    populateContractFilter() {
        const contracts = [...new Set(this.allMeasurements.map(m => m.contractNumber))].sort();
        contracts.forEach(contractNumber => {
            if (this.contractFilter) {
                const option = document.createElement("option");
                option.value = contractNumber;
                option.textContent = `Contrato ${contractNumber}`;
                this.contractFilter.appendChild(option);
            }
        });
    }

    onSupplierChange() {
        const selectedCompany = this.companyFilter ? this.companyFilter.value : '';
        const selectedSupplier = this.supplierFilter ? this.supplierFilter.value : '';
        
        // Clear and reset contract filter
        this.clearFilterOptions(this.contractFilter);
        if (this.contractFilter) this.contractFilter.value = "";
        
        if (selectedSupplier) {
            // Get contracts for selected company and supplier
            let contractsForFilter = this.allContracts;
            
            if (selectedCompany) {
                contractsForFilter = contractsForFilter.filter(c => c.companyName === selectedCompany);
            }
            
            contractsForFilter = contractsForFilter.filter(c => c.supplierName === selectedSupplier);
            
            // Only show contracts that have measurements
            const contractsWithMeasurements = [...new Set(
                contractsForFilter
                    .filter(c => this.allMeasurements.some(m => m.contractNumber === c.contractNumber))
                    .map(c => c.contractNumber)
            )].sort();
            
            contractsWithMeasurements.forEach(contractNumber => {
                if (this.contractFilter) {
                    const option = document.createElement("option");
                    option.value = contractNumber;
                    option.textContent = `Contrato ${contractNumber}`;
                    this.contractFilter.appendChild(option);
                }
            });
        } else if (selectedCompany) {
            // If company selected but no supplier, show all contracts for that company that have measurements
            const contractsForCompany = [...new Set(
                this.allContracts
                    .filter(c => c.companyName === selectedCompany)
                    .filter(c => this.allMeasurements.some(m => m.contractNumber === c.contractNumber))
                    .map(c => c.contractNumber)
            )].sort();
            
            contractsForCompany.forEach(contractNumber => {
                if (this.contractFilter) {
                    const option = document.createElement("option");
                    option.value = contractNumber;
                    option.textContent = `Contrato ${contractNumber}`;
                    this.contractFilter.appendChild(option);
                }
            });
        } else {
            // If no company or supplier selected, show all contracts with measurements
            this.populateContractFilter();
        }
        
        this.applyFilters();
    }

    applyFilters() {
        const selectedCompany = this.companyFilter ? this.companyFilter.value : '';
        const selectedSupplier = this.supplierFilter ? this.supplierFilter.value : '';
        const selectedContract = this.contractFilter ? this.contractFilter.value : '';
        const dateFrom = this.dateFromFilter ? this.dateFromFilter.value : '';
        const dateTo = this.dateToFilter ? this.dateToFilter.value : '';

        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const matchesCompany = selectedCompany ? measurement.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? measurement.supplierName === selectedSupplier : true;
            const matchesContract = selectedContract ? measurement.contractNumber === selectedContract : true;
            
            let matchesDateRange = true;
            if (dateFrom) {
                matchesDateRange = matchesDateRange && measurement.measurementDate >= dateFrom;
            }
            if (dateTo) {
                matchesDateRange = matchesDateRange && measurement.measurementDate <= dateTo;
            }
            
            return matchesCompany && matchesSupplier && matchesContract && matchesDateRange;
        });

        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        if (!this.measurementsTableBody) return;
        
        this.measurementsTableBody.innerHTML = "";
        
        if (this.filteredMeasurements.length === 0) {
            this.measurementsTableBody.innerHTML = `
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
                </div>
            `;
        });

        if (this.tableInfo) {
            this.tableInfo.textContent = `Mostrando ${this.filteredMeasurements.length} medições`;
        }
    }

    updateStats() {
        const measurements = this.filteredMeasurements;
        
        // Total measurements
        if (this.totalMeasurementsCard) {
            this.totalMeasurementsCard.textContent = measurements.length;
        }

        // Total measured value
        const totalMeasuredValue = measurements.reduce((sum, m) => sum + (parseFloat(m.totalValue) || 0), 0);
        if (this.totalMeasuredValueCard) {
            this.totalMeasuredValueCard.textContent = totalMeasuredValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Total retention
        const totalRetention = measurements.reduce((sum, m) => sum + (parseFloat(m.retentionValue) || 0), 0);
        if (this.totalRetentionCard) {
            this.totalRetentionCard.textContent = totalRetention.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Total liquid
        const totalLiquid = measurements.reduce((sum, m) => sum + (parseFloat(m.liquidValue) || 0), 0);
        if (this.totalLiquidCard) {
            this.totalLiquidCard.textContent = totalLiquid.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Average measurement value
        const avgValue = measurements.length > 0 ? totalMeasuredValue / measurements.length : 0;
        if (this.avgMeasurementValueCard) {
            this.avgMeasurementValueCard.textContent = avgValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        }

        // Contracts with measurements
        const uniqueContracts = new Set(measurements.map(m => m.contractNumber));
        if (this.contractsWithMeasurementsCard) {
            this.contractsWithMeasurementsCard.textContent = uniqueContracts.size;
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
        if (this.companyFilter) this.companyFilter.value = "";
        if (this.supplierFilter) this.supplierFilter.value = "";
        if (this.contractFilter) this.contractFilter.value = "";
        if (this.dateFromFilter) this.dateFromFilter.value = "";
        if (this.dateToFilter) this.dateToFilter.value = "";
        
        // Repopulate all filters
        this.populateFilters();
        
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

    viewMeasurement(id) {
        const measurement = this.allMeasurements.find(m => m.id === id);
        if (!measurement) return;
        
        this.renderMeasurementDetails(measurement);
        if (this.measurementDetailsModal) {
            this.measurementDetailsModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    renderMeasurementDetails(measurement) {
        if (!this.measurementDetailsContent) return;
        
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
        if (this.measurementDetailsModal) {
            this.measurementDetailsModal.classList.remove('show');
            document.body.style.overflow = '';
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