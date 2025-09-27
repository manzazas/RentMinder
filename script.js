// Property Management Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupDragAndDrop();
    setupMaintenanceForm();
    setupActionButtons();
    setupNavigation();
}

// ==================== DRAG & DROP UPLOAD FUNCTIONALITY ====================

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');

    // Drag and drop event listeners
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change listener
    fileInput.addEventListener('change', handleFileSelect);

    function handleDragOver(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    function processFile(file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                             'text/plain'];
        
        if (!allowedTypes.includes(file.type)) {
            showUploadStatus('error', 'Please upload a PDF, DOC, DOCX, or TXT file.');
            fileInput.value = '';
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showUploadStatus('error', 'File size must be less than 10MB.');
            fileInput.value = '';
            return;
        }

        showUploadStatus('processing', 'Processing file...');
        
        // Simulate file processing (in real app, this would call an API)
        setTimeout(() => {
            showUploadStatus('success', `File "${file.name}" uploaded successfully!`);
            simulateLeaseParsing();
        }, 2000);
        fileInput.value = '';
    }

    function showUploadStatus(type, message) {
        const statusIcon = uploadStatus.querySelector('i');
        const statusText = uploadStatus.querySelector('p');
        
        uploadStatus.className = `text-center upload-status ${type}`;
        
        switch(type) {
            case 'success':
                statusIcon.className = 'bi bi-check-circle-fill text-success';
                break;
            case 'error':
                statusIcon.className = 'bi bi-exclamation-triangle-fill text-danger';
                break;
            case 'processing':
                statusIcon.className = 'bi bi-hourglass-split text-warning';
                break;
            default:
                statusIcon.className = 'bi bi-hourglass-split text-warning';
        }
        
        statusText.textContent = message;
    }
}

// ==================== LEASE PARSING SIMULATION ====================

function simulateLeaseParsing() {
    // Simulate parsed lease data
    const leaseData = {
        rent: '$2,500.00',
        deposit: '$2,500.00',
        leaseStart: '2024-01-01',
        leaseEnd: '2024-12-31',
        dueDate: '1st of each month',
        landlordName: 'John Smith',
        landlordEmail: 'john.smith@email.com',
        landlordPhone: '(555) 123-4567',
        propertyAddress: '123 Main Street, Anytown, ST 12345',
        tenantName: 'Jane Doe'
    };

    displayParsedFields(leaseData);
}

function displayParsedFields(data) {
    const parsedSection = document.getElementById('parsed-fields');
    const parsedCards = document.getElementById('parsed-cards');
    
    // Show the parsed fields section
    parsedSection.style.display = 'block';
    
    // Create cards for each field
    const fields = [
        { title: 'Monthly Rent', value: data.rent, icon: 'bi-currency-dollar', color: 'primary' },
        { title: 'Security Deposit', value: data.deposit, icon: 'bi-shield-check', color: 'success' },
        { title: 'Lease Start Date', value: formatDate(data.leaseStart), icon: 'bi-calendar-event', color: 'info' },
        { title: 'Lease End Date', value: formatDate(data.leaseEnd), icon: 'bi-calendar-x', color: 'warning' },
        { title: 'Rent Due Date', value: data.dueDate, icon: 'bi-calendar-check', color: 'primary' },
        { title: 'Landlord Name', value: data.landlordName, icon: 'bi-person', color: 'secondary' },
        { title: 'Landlord Email', value: data.landlordEmail, icon: 'bi-envelope', color: 'info' },
        { title: 'Landlord Phone', value: data.landlordPhone, icon: 'bi-telephone', color: 'success' },
        { title: 'Property Address', value: data.propertyAddress, icon: 'bi-geo-alt', color: 'dark' },
        { title: 'Tenant Name', value: data.tenantName, icon: 'bi-person-badge', color: 'primary' }
    ];

    parsedCards.innerHTML = '';
    
    fields.forEach(field => {
        const card = createFieldCard(field);
        parsedCards.appendChild(card);
    });

    // Scroll to parsed fields
    parsedSection.scrollIntoView({ behavior: 'smooth' });
}

function createFieldCard(field) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    col.innerHTML = `
        <div class="card parsed-card h-100">
            <div class="card-header">
                <i class="bi ${field.icon} me-2"></i>
                ${field.title}
            </div>
            <div class="card-body">
                <div class="parsed-value text-${field.color}">
                    ${field.value}
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ==================== MAINTENANCE FORM FUNCTIONALITY ====================

function setupMaintenanceForm() {
    const form = document.getElementById('maintenance-form');
    const emailDraft = document.getElementById('email-draft');
    const copyButton = document.getElementById('copy-email');
    const sendButton = document.getElementById('send-email');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generateEmailDraft();
    });

    copyButton.addEventListener('click', copyEmailToClipboard);
    sendButton.addEventListener('click', sendEmail);
}

function generateEmailDraft() {
    const formData = {
        tenantName: document.getElementById('tenant-name').value,
        propertyAddress: document.getElementById('property-address').value,
        issueType: document.getElementById('issue-type').value,
        priority: document.getElementById('priority').value,
        issueDescription: document.getElementById('issue-description').value,
        contactPhone: document.getElementById('contact-phone').value
    };

    // Generate email draft using Gemini-style formatting
    const emailDraft = createEmailDraft(formData);
    
    // Display the draft
    const emailContainer = document.getElementById('email-draft');
    emailContainer.innerHTML = emailDraft;
    
    // Show action buttons
    document.getElementById('copy-email').style.display = 'inline-block';
    document.getElementById('send-email').style.display = 'inline-block';
    
    // Scroll to email draft
    document.getElementById('email-draft').scrollIntoView({ behavior: 'smooth' });
}

function createEmailDraft(data) {
    const priorityColors = {
        'low': 'success',
        'medium': 'warning', 
        'high': 'danger',
        'emergency': 'danger'
    };

    const priorityClass = priorityColors[data.priority] || 'secondary';
    
    return `
        <h6>Subject: Maintenance Request - ${data.issueType.charAt(0).toUpperCase() + data.issueType.slice(1)} Issue at ${data.propertyAddress}</h6>
        
        <strong>To:</strong> maintenance@propertymanagement.com<br>
        <strong>From:</strong> ${data.tenantName}<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br><br>
        
        <strong>Property Information:</strong><br>
        • Address: ${data.propertyAddress}<br>
        • Tenant: ${data.tenantName}<br>
        • Contact: ${data.contactPhone}<br><br>
        
        <strong>Issue Details:</strong><br>
        • Type: ${data.issueType.charAt(0).toUpperCase() + data.issueType.slice(1)}<br>
        • Priority: <span class="badge bg-${priorityClass} priority-badge">${data.priority.toUpperCase()}</span><br>
        • Description: ${data.issueDescription}<br><br>
        
        <strong>Request:</strong><br>
        Please schedule a maintenance visit to address this issue. I am available for contact at the phone number provided above.<br><br>
        
        Thank you for your prompt attention to this matter.<br><br>
        
        Best regards,<br>
        ${data.tenantName}
    `;
}

function copyEmailToClipboard() {
    const emailContent = document.getElementById('email-draft').textContent;
    
    navigator.clipboard.writeText(emailContent).then(() => {
        // Show success feedback
        const button = document.getElementById('copy-email');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="bi bi-check"></i> Copied!';
        button.classList.remove('btn-outline-success');
        button.classList.add('btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-success');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy email: ', err);
        alert('Failed to copy email to clipboard');
    });
}

function sendEmail() {
    // Simulate sending email
    const button = document.getElementById('send-email');
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = '<i class="bi bi-check"></i> Sent!';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
            button.disabled = false;
        }, 2000);
    }, 1500);
}

// ==================== ACTION BUTTONS FUNCTIONALITY ====================

function setupActionButtons() {
    const calendarButton = document.getElementById('create-calendar-events');
    const exportButton = document.getElementById('export-report');

    calendarButton.addEventListener('click', createCalendarEvents);
    exportButton.addEventListener('click', exportReport);
}

function createCalendarEvents() {
    // Show modal or form for creating calendar events
    const events = [
        {
            title: 'Property Inspection - 123 Main St',
            date: '2024-02-15',
            time: '10:00 AM',
            type: 'inspection'
        },
        {
            title: 'Maintenance Appointment',
            date: '2024-02-20',
            time: '2:00 PM', 
            type: 'maintenance'
        },
        {
            title: 'Lease Renewal Meeting',
            date: '2024-03-01',
            time: '11:00 AM',
            type: 'lease'
        }
    ];

    showCalendarModal(events);
}

function showCalendarModal(events) {
    // Create and show a Bootstrap modal
    const modalHtml = `
        <div class="modal fade" id="calendarModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-calendar-plus"></i> Create Calendar Events
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${events.map(event => `
                                <div class="col-md-6 mb-3">
                                    <div class="card">
                                        <div class="card-body">
                                            <h6 class="card-title">${event.title}</h6>
                                            <p class="card-text">
                                                <i class="bi bi-calendar-event"></i> ${event.date}<br>
                                                <i class="bi bi-clock"></i> ${event.time}
                                            </p>
                                            <button class="btn btn-sm btn-outline-primary" onclick="addToCalendar('${event.title}', '${event.date}', '${event.time}')">
                                                <i class="bi bi-plus-circle"></i> Add to Calendar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="addAllToCalendar()">
                            <i class="bi bi-calendar-plus"></i> Add All Events
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('calendarModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('calendarModal'));
    modal.show();
}

function addToCalendar(title, date, time) {
    // Simulate adding to calendar
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-check"></i> Added!';
    button.classList.remove('btn-outline-primary');
    button.classList.add('btn-success');
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-primary');
        button.disabled = false;
    }, 2000);
}

function addAllToCalendar() {
    // Simulate adding all events
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = '<i class="bi bi-check"></i> All Added!';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
        }, 1500);
    }, 2000);
}

function exportReport() {
    // Show export options modal
    const modalHtml = `
        <div class="modal fade" id="exportModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-file-earmark-bar-graph"></i> Export Report
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Report Type</label>
                            <select class="form-select" id="report-type">
                                <option value="monthly">Monthly Summary</option>
                                <option value="maintenance">Maintenance Log</option>
                                <option value="financial">Financial Report</option>
                                <option value="tenant">Tenant Information</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Date Range</label>
                            <div class="row">
                                <div class="col-6">
                                    <input type="date" class="form-control" id="start-date">
                                </div>
                                <div class="col-6">
                                    <input type="date" class="form-control" id="end-date">
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Format</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="format" id="pdf-format" value="pdf" checked>
                                <label class="form-check-label" for="pdf-format">
                                    <i class="bi bi-file-pdf text-danger"></i> PDF
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="generateReport()">
                            <i class="bi bi-download"></i> Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('exportModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('end-date').value = lastDay.toISOString().split('T')[0];
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('exportModal'));
    modal.show();
}

function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const format = document.querySelector('input[name="format"]:checked').value;
    
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
    button.disabled = true;
    
    // Simulate report generation
    setTimeout(() => {
        button.innerHTML = '<i class="bi bi-check"></i> Generated!';
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
        
        // Simulate download
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = '#'; // In real app, this would be the generated file URL
            link.download = `${reportType}_report_${startDate}_to_${endDate}.${format}`;
            link.click();
            
            bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        }, 1000);
    }, 2000);
}

// ==================== NAVIGATION FUNCTIONALITY ====================

function setupNavigation() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Update active navigation item on scroll
    window.addEventListener('scroll', updateActiveNavItem);
}

function updateActiveNavItem() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

// Add some utility functions for better user experience
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Initialize tooltips if Bootstrap tooltips are used
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}
