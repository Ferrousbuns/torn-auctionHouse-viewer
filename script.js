document.addEventListener('DOMContentLoaded', () => {
    const searchWrapper = document.getElementById('searchWrapper');
    const searchInput = document.getElementById('searchInput');
    const tableContainer = document.getElementById('tableContainer');
    const tableBody = document.getElementById('tableBody');
    const tableHead = document.getElementById('tableHead');
    const emptyState = document.getElementById('emptyState');
    const tableStats = document.getElementById('tableStats');
    const loadingText = document.getElementById('loadingText');
    const loadingSubtext = document.getElementById('loadingSubtext');
    const columnsBtn = document.getElementById('columnsBtn');
    const columnsMenu = document.getElementById('columnsMenu');
    const columnsList = document.getElementById('columnsList');

    let csvData = [];
    let headers = [];
    let hiddenColumns = new Set();
    let sortColumn = 'Sold Datetime';
    let sortDirection = 'desc';

    // Columns Menu Toggle
    if (columnsBtn && columnsMenu) {
        columnsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            columnsMenu.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!columnsMenu.contains(e.target) && e.target !== columnsBtn) {
                columnsMenu.classList.add('hidden');
            }
        });
    }

    // Automatically Fetch CSV Data from localized API Server
    Papa.parse('/data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data && results.data.length > 0) {
                csvData = results.data;
                headers = results.meta.fields || Object.keys(csvData[0]);

                // Populate Columns Menu
                if (columnsList) {
                    columnsList.innerHTML = '';
                    headers.forEach(header => {
                        const label = document.createElement('label');
                        label.className = 'column-toggle-label';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'column-toggle-checkbox';
                        checkbox.checked = true;
                        checkbox.value = header;

                        checkbox.addEventListener('change', (e) => {
                            if (e.target.checked) {
                                hiddenColumns.delete(header);
                            } else {
                                hiddenColumns.add(header);
                            }
                            sortData(); // re-render table with current sort and search
                        });

                        label.appendChild(checkbox);
                        label.appendChild(document.createTextNode(header));
                        columnsList.appendChild(label);
                    });
                }

                // Show UI elements
                emptyState.classList.add('hidden');
                tableContainer.classList.remove('hidden');

                // Sort by default first, which will call renderTable internally.
                sortData();
            } else {
                loadingText.textContent = 'Data Not Found';
                loadingSubtext.textContent = 'The auction data appears to be empty or malformed.';
                document.getElementById('loadingSpinner').style.display = 'none';
            }
        },
        error: function (error) {
            console.error("Error parsing CSV:", error);
            loadingText.textContent = 'Error Loading Data';
            loadingSubtext.textContent = 'Failed to load data from the server. Ensure the proxy server is running and the master file exists.';
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    });

    // Search Handler
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            renderTable(csvData);
            return;
        }

        const filteredData = csvData.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm);
            });
        });

        renderTable(filteredData, searchTerm);
    });

    function renderTable(data, highlightTerm = '') {
        // Clear previous content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Update Stats
        tableStats.innerHTML = `
            <span>Showing ${data.length} ${data.length === 1 ? 'row' : 'rows'}</span>
            ${highlightTerm ? '<span>(Filtered)</span>' : ''}
        `;

        const visibleCols = headers.length - hiddenColumns.size;

        if (data.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = visibleCols > 0 ? visibleCols : 1;
            td.textContent = 'No matching results found.';
            td.style.textAlign = 'center';
            td.style.padding = '40px';
            td.style.color = '#94a3b8';
            tr.appendChild(td);
            tableBody.appendChild(tr);

            // Still render headers
            renderHeaders();
            return;
        }

        renderHeaders();

        // Render rows
        // Note: For very large datasets, pagination or virtualization would be needed.
        // For standard CSV viewing, rendering up to a few thousand rows is acceptable.

        // Limit rendering to prevent browser freeze on huge CSVs
        const maxRender = Math.min(data.length, 5000);

        // Document fragment for better performance
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < maxRender; i++) {
            const row = data[i];
            const tr = document.createElement('tr');

            headers.forEach(header => {
                if (hiddenColumns.has(header)) return;

                const td = document.createElement('td');
                let cellValue = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';

                // Add highlighting if search term is active
                if (highlightTerm && cellValue.toLowerCase().includes(highlightTerm)) {
                    const regex = new RegExp(`(${escapeRegExp(highlightTerm)})`, 'gi');
                    td.innerHTML = cellValue.replace(regex, '<mark>$1</mark>');
                } else {
                    td.textContent = cellValue;
                }

                tr.appendChild(td);
            });

            fragment.appendChild(tr);
        }

        tableBody.appendChild(fragment);

        if (data.length > maxRender) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = visibleCols > 0 ? visibleCols : 1;
            td.innerHTML = `<em>Showing first ${maxRender} rows of ${data.length} results to maintain performance.</em>`;
            td.style.textAlign = 'center';
            td.style.color = '#94a3b8';
            tr.appendChild(td);
            tableBody.appendChild(tr);
        }
    }

    function renderHeaders() {
        if (!headers || headers.length === 0) return;

        const tr = document.createElement('tr');
        headers.forEach(header => {
            if (hiddenColumns.has(header)) return;

            const th = document.createElement('th');
            th.className = 'sortable-header';

            let sortIndicator = '<span class="sort-icon">' + (sortColumn === header ? (sortDirection === 'asc' ? '↑' : '↓') : '↕') + '</span>';
            if (sortColumn === header) {
                th.classList.add('active-sort');
            }

            th.innerHTML = `<span>${header}</span>${sortIndicator}`;

            th.addEventListener('click', (e) => {
                if (sortColumn === header) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = header;
                    sortDirection = 'asc';
                }
                sortData();
            });
            tr.appendChild(th);
        });
        tableHead.appendChild(tr);
    }

    function sortData() {
        if (sortColumn) {
            csvData.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];

                if (valA === undefined || valA === null) valA = '';
                if (valB === undefined || valB === null) valB = '';

                // Handle comma-separated numbers (e.g. "1,500,000")
                const cleanA = String(valA).replace(/,/g, '');
                const cleanB = String(valB).replace(/,/g, '');
                const numA = Number(cleanA);
                const numB = Number(cleanB);

                if (!isNaN(numA) && !isNaN(numB) && cleanA.trim() !== '' && cleanB.trim() !== '') {
                    return sortDirection === 'asc' ? numA - numB : numB - numA;
                }

                if (sortColumn === 'RW Bonus') {
                    valA = String(valA).replace(/\d+%\s*/g, '').trim().toLowerCase();
                    valB = String(valB).replace(/\d+%\s*/g, '').trim().toLowerCase();
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            const filteredData = csvData.filter(row => {
                return Object.values(row).some(value => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(searchTerm);
                });
            });
            renderTable(filteredData, searchTerm);
        } else {
            renderTable(csvData);
        }
    }



    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    // --- RW Bonus Stats Tracker Logic --- //

    // Toggle button handler
    toggleStatsBtn.addEventListener('click', () => {
        if (statsGridContainer.classList.contains('hidden')) {
            statsGridContainer.classList.remove('hidden');
            toggleStatsBtn.textContent = 'Hide Tracker';
        } else {
            statsGridContainer.classList.add('hidden');
            toggleStatsBtn.textContent = 'Show Tracker';
        }
    });

    function updateStatsTracker(data) {
        const bonusStats = {};

        // Group data by exact bonus
        data.forEach(row => {
            let bonusRaw = row['RW Bonus'];
            let priceRaw = row['Sell Price'];

            if (!bonusRaw || !priceRaw || bonusRaw.trim() === '' || bonusRaw.trim() === 'N/A') {
                return;
            }

            // Split on pipe char for items like "33% Proficience | 115% Throttle"
            const bonuses = bonusRaw.split('|').map(b => b.trim());
            const price = Number(String(priceRaw).replace(/,/g, ''));

            if (isNaN(price)) return;

            bonuses.forEach(bonus => {
                if (!bonusStats[bonus]) {
                    bonusStats[bonus] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
                }

                bonusStats[bonus].count++;
                bonusStats[bonus].sum += price;
                if (price < bonusStats[bonus].min) bonusStats[bonus].min = price;
                if (price > bonusStats[bonus].max) bonusStats[bonus].max = price;
            });
        });

        renderStatsGrid(bonusStats);
    }

    function renderStatsGrid(bonusStats) {
        statsGrid.innerHTML = '';
        const sortedBonuses = Object.keys(bonusStats).sort();

        if (sortedBonuses.length === 0) {
            statsGrid.innerHTML = `
                <div class="stat-card" style="text-align: center; color: var(--text-muted);">
                    No RW Bonus data available in current view.
                </div>
            `;
            return;
        }

        sortedBonuses.forEach(bonus => {
            const stats = bonusStats[bonus];
            const avg = Math.round(stats.sum / stats.count);

            const card = document.createElement('div');
            card.className = 'stat-card';

            card.innerHTML = `
                <div class="stat-title" title="${bonus}">${bonus}</div>
                <div class="stat-row">
                    <span class="stat-label">Average</span>
                    <span class="stat-val">$${formatNumber(avg)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Min</span>
                    <span class="stat-val" style="color: #8b5cf6;">$${formatNumber(stats.min)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Max</span>
                    <span class="stat-val" style="color: #f43f5e;">$${formatNumber(stats.max)}</span>
                </div>
                <div class="stat-count">${stats.count} recorded sales</div>
            `;

            statsGrid.appendChild(card);
        });
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
});
