class ContractPortal {
    constructor() {
        this.allContracts = [];
        this.filteredContracts = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filtersCollapsed = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadContracts();
    }

    initializeElements() {
        // Stats elements
        this.totalContractsCard = document.getElementById("totalContracts");
        this.totalValueCard = document.getElementById("totalValue");
        this.totalCompaniesCard = document.getElementById("totalCompanies");
        this.totalSuppliersCard = document.getElementById("totalSuppliers");
        this.expiringContractsCard = document.getElementById("expiringContracts");
        
        // Table elements
        this.contractsTableBody = document.querySelector("#contractsTable tbody");
        this.tableInfo = document.getElementById("tableInfo");
        
        // Filter elements
        this.statusFilter = document.getElementById("statusFilter");
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.contractNumberFilter = document.getElementById("contractNumberFilter");
        this.dateRangeFilter = document.getElementById("dateRangeFilter");
        this.filtersContainer = document.getElementById("filtersContainer");
        
        // Button elements
        this.clearFiltersButton = document.getElementById("clearFilters");
        this.refreshButton = document.getElementById("refreshBtn");
        this.exportButton = document.getElementById("exportBtn");
        this.toggleFiltersButton = document.getElementById("toggleFilters");
        
        // Other elements
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
    }

    bindEvents() {
        // Filter events
        this.statusFilter.addEventListener("change", () => this.applyFilters());
        this.companyFilter.addEventListener("change", () => this.applyFilters());
        this.supplierFilter.addEventListener("change", () => this.applyFilters());
        this.contractNumberFilter.addEventListener("input", () => this.applyFilters());
        this.dateRangeFilter.addEventListener("change", () => this.applyFilters());
        
        // Button events
        this.clearFiltersButton.addEventListener("click", () => this.clearFilters());
        this.refreshButton.addEventListener("click", () => this.loadContracts());
        this.exportButton.addEventListener("click", () => this.exportToCSV());
        this.toggleFiltersButton.addEventListener("click", () => this.toggleFilters());
        
        // Table sorting events
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.sortTable(th.dataset.sort));
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

    async loadContracts() {
        this.showLoading();
        this.refreshButton.querySelector('i').classList.add('fa-spin');
        
        try {
            const response = await fetch("/api/contracts");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.allContracts = await response.json();
            this.populateFilters();
            this.applyFilters();
            this.showToast('Contratos carregados com sucesso!');
            
        } catch (error) {
            console.error("Erro ao buscar contratos:", error);
            this.showToast(`Erro ao carregar dados: ${error.message}`, 'error');
            this.contractsTableBody.innerHTML = `
                <tr><td colspan="9" class="text-center">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar dados: ${error.message}
                </td></tr>
            `;
        } finally {
            this.hideLoading();
            this.refreshButton.querySelector('i').classList.remove('fa-spin');
        }
    }

    populateFilters() {
        // Clear existing options (except first)
        [this.statusFilter, this.companyFilter, this.supplierFilter].forEach(select => {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        });

        // Populate status filter
        const statuses = [...new Set(this.allContracts.map(c => c.status))].sort();
        statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            this.statusFilter.appendChild(option);
        });

        // Populate company filter
        const companies = [...new Set(this.allContracts.map(c => c.companyName))].sort();
        companies.forEach(company => {
            const option = document.createElement("option");
            option.value = company;
            option.textContent = company;
            this.companyFilter.appendChild(option);
        });

        // Populate supplier filter
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        suppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
    }

    applyFilters() {
        const selectedStatus = this.statusFilter.value;
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const contractNumberText = this.contractNumberFilter.value.toLowerCase();
        const dateRange = this.dateRangeFilter.value;

        this.filteredContracts = this.allContracts.filter(contract => {
            const matchesStatus = selectedStatus ? contract.status === selectedStatus : true;
            const matchesCompany = selectedCompany ? contract.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? contract.supplierName === selectedSupplier : true;
            const matchesContractNumber = contractNumberText ? 
                contract.contractNumber.toLowerCase().includes(contractNumberText) : true;
            
            let matchesDateRange = true;
            if (dateRange) {
                const endDate = new Date(contract.endDate);
                const today = new Date();
                const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                
                switch (dateRange) {
                    case 'expired':
                        matchesDateRange = diffDays < 0;
                        break;
                    case 'expiring-30':
                        matchesDateRange = diffDays >= 0 && diffDays <= 30;
                        break;
                    case 'expiring-60':
                        matchesDateRange = diffDays >= 0 && diffDays <= 60;
                        break;
                    case 'future':
                        matchesDateRange = diffDays > 60;
                        break;
                }
            }
            
            return matchesStatus && matchesCompany && matchesSupplier && 
                   matchesContractNumber && matchesDateRange;
        });

        this.renderTable();
        this.updateStats();
    }

    // Função para normalizar status e aplicar classe CSS
    getStatusClass(status) {
        if (!status) return 'status-default';
        
        const normalizedStatus = status.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[áàâã]/g, 'a')
            .replace(/[éèê]/g, 'e')
            .replace(/[íìî]/g, 'i')
            .replace(/[óòôõ]/g, 'o')
            .replace(/[úùû]/g, 'u')
            .replace(/[ç]/g, 'c');
        
        // Mapeamento de status para classes CSS
        const statusMap = {
            'ativo': 'status-ativo',
            'active': 'status-ativo',
            'inativo': 'status-inativo',
            'inactive': 'status-inativo',
            'pendente': 'status-pendente',
            'pending': 'status-pendente',
            'aprovado': 'status-aprovado',
            'approved': 'status-aprovado',
            'cancelado': 'status-cancelado',
            'cancelled': 'status-cancelado',
            'canceled': 'status-cancelado',
            'suspenso': 'status-suspenso',
            'suspended': 'status-suspenso',
            'renovado': 'status-renovado',
            'renewed': 'status-renovado',
            'vencido': 'status-vencido',
            'expired': 'status-vencido',
            'em-andamento': 'status-em-andamento',
            'in-progress': 'status-em-andamento',
            'ongoing': 'status-em-andamento',
            'finalizado': 'status-finalizado',
            'finished': 'status-finalizado',
            'completed': 'status-finalizado'
        };
        
        return statusMap[normalizedStatus] || 'status-default';
    }

    renderTable() {
        this.contractsTableBody.innerHTML = "";
        
        if (this.filteredContracts.length === 0) {
            this.contractsTableBody.innerHTML = `
                <tr><td colspan="9" class="text-center">
                    <i class="fas fa-search"></i> 
                    Nenhum contrato encontrado com os filtros aplicados.
                </td></tr>
            `;
            this.tableInfo.textContent = "Mostrando 0 contratos";
            return;
        }

        this.filteredContracts.forEach(contract => {
            const row = this.contractsTableBody.insertRow();
            
            // Contract Number
            row.insertCell().textContent = contract.contractNumber;
            
            // Status with enhanced styling
            const statusCell = row.insertCell();
            const statusClass = this.getStatusClass(contract.status);
            statusCell.innerHTML = `<span class="status-cell ${statusClass}">${contract.status}</span>`;
            
            // Company and Supplier
            row.insertCell().textContent = contract.companyName;
            row.insertCell().textContent = contract.supplierName;
            
            // End Date
            const endDateCell = row.insertCell();
            const endDate = new Date(contract.endDate);
            endDateCell.textContent = endDate.toLocaleDateString('pt-BR');
            
            // Days to expiration with enhanced styling
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const diasCell = row.insertCell();
            if (diffDays > 30) {
                diasCell.innerHTML = `<span class="days-future">${diffDays} dias restantes</span>`;
            } else if (diffDays > 0) {
                diasCell.innerHTML = `<span class="days-expiring">${diffDays} dias restantes</span>`;
            } else if (diffDays === 0) {
                diasCell.innerHTML = `<span class="days-expiring">Vence hoje</span>`;
            } else {
                diasCell.innerHTML = `<span class="days-expired">${Math.abs(diffDays)} dias vencido</span>`;
            }
            
            // Values
            const laborValue = parseFloat(contract.totalLaborValue) || 0;
            const materialValue = parseFloat(contract.totalMaterialValue) || 0;
            const totalValue = parseFloat(contract.valorTotal) || 0;
            
            row.insertCell().textContent = laborValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            row.insertCell().textContent = materialValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
            row.insertCell().textContent = totalValue.toLocaleString("pt-BR", { 
                style: "currency", currency: "BRL" 
            });
        });

        this.tableInfo.textContent = `Mostrando ${this.filteredContracts.length} contratos`;
    }

    updateStats() {
        const contracts = this.filteredContracts;
        
        // Total contracts
        this.totalContractsCard.textContent = contracts.length;

        // Total value
        const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.valorTotal) || 0), 0);
        this.totalValueCard.textContent = totalValue.toLocaleString("pt-BR", { 
            style: "currency", currency: "BRL" 
        });

        // Unique companies
        const uniqueCompanies = new Set(contracts.map(c => c.companyName));
        this.totalCompaniesCard.textContent = uniqueCompanies.size;

        // Unique suppliers
        const uniqueSuppliers = new Set(contracts.map(c => c.supplierName));
        this.totalSuppliersCard.textContent = uniqueSuppliers.size;

        // Expiring contracts (next 30 days)
        const today = new Date();
        const expiringContracts = contracts.filter(contract => {
            const endDate = new Date(contract.endDate);
            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        });
        this.expiringContractsCard.textContent = expiringContracts.length;
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
        this.filteredContracts.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle different data types
            if (column === 'endDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (column === 'diasVencimento') {
                const aDate = new Date(a.endDate);
                const bDate = new Date(b.endDate);
                const today = new Date();
                aVal = Math.ceil((aDate - today) / (1000 * 60 * 60 * 24));
                bVal = Math.ceil((bDate - today) / (1000 * 60 * 60 * 24));
            } else if (column.includes('Value') || column === 'valorTotal') {
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
        this.statusFilter.value = "";
        this.companyFilter.value = "";
        this.supplierFilter.value = "";
        this.contractNumberFilter.value = "";
        this.dateRangeFilter.value = "";
        
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

    exportToCSV() {
        if (this.filteredContracts.length === 0) {
            this.showToast('Nenhum contrato para exportar!', 'warning');
            return;
        }

        const headers = [
            'Número do Contrato',
            'Status',
            'Empresa',
            'Fornecedor',
            'Data de Vencimento',
            'Dias para Vencimento',
            'Valor Mão de Obra',
            'Valor Material',
            'Valor Total'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredContracts.map(contract => {
                const endDate = new Date(contract.endDate);
                const today = new Date();
                const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                
                return [
                    `"${contract.contractNumber}"`,
                    `"${contract.status}"`,
                    `"${contract.companyName}"`,
                    `"${contract.supplierName}"`,
                    `"${endDate.toLocaleDateString('pt-BR')}"`,
                    diffDays,
                    parseFloat(contract.totalLaborValue) || 0,
                    parseFloat(contract.totalMaterialValue) || 0,
                    parseFloat(contract.valorTotal) || 0
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `contratos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Arquivo CSV exportado com sucesso!');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new ContractPortal();
});