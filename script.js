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
        
        // Upload and parse the file using the API
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/parse', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.parsed) {
                showUploadStatus('success', `File "${file.name}" parsed successfully!`);
                
                // Convert API response to display format
                const leaseData = convertApiResponseToDisplayData(data.parsed);
                displayParsedFields(leaseData);
            } else {
                showUploadStatus('error', 'Error parsing file: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showUploadStatus('error', 'Error uploading file. Please try again.');
        });
        
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

// ==================== API RESPONSE CONVERSION ====================

function convertApiResponseToDisplayData(parsedData) {
    // Convert API response format to display format
    const rent = parsedData.rent || {};
    const deposit = parsedData.deposit || {};
    const leaseTerm = parsedData.lease_term || {};
    const landlord = parsedData.landlord || {};
    
    // Format rent amount
    const rentAmount = rent.amount ? `$${rent.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}` : 'Not specified';
    
    // Format deposit amount
    const depositAmount = deposit.amount ? `$${deposit.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}` : 'Not specified';
    
    // Format due date
    const dueDate = rent.due_day ? `${rent.due_day}${getOrdinalSuffix(rent.due_day)} of each month` : 'Not specified';
    
    return {
        rent: rentAmount,
        deposit: depositAmount,
        leaseStart: leaseTerm.start_date || 'Not specified',
        leaseEnd: leaseTerm.end_date || 'Not specified',
        dueDate: dueDate,
        landlordName: landlord.name || 'Not specified',
        landlordEmail: landlord.email || 'Not specified',
        landlordPhone: landlord.phone || 'Not specified',
        propertyAddress: landlord.address || 'Not specified',
        tenantName: 'Not specified' // This might need to be added to the schema
    };
}

function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
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
    
    // Show the calendar integration section
    const calendarIntegration = document.getElementById('calendar-integration');
    calendarIntegration.style.display = 'block';
    
    // Store lease data globally for later use
    window.currentLeaseData = data;
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
    const googleCalendarBtn = document.getElementById('google-calendar-btn');

    calendarButton.addEventListener('click', createCalendarEvents);
    exportButton.addEventListener('click', exportReport);
    
    if (googleCalendarBtn) {
        googleCalendarBtn.addEventListener('click', setupGoogleCalendarIntegration);
    }
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
    // Get the lease data and trigger Google OAuth
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
    
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Connecting to Google...';
    button.disabled = true;
    
    // Initialize Google OAuth
    gapi.load('auth2', function() {
        gapi.auth2.init({
            client_id: '232827582501-jg5m3642e9tkc28tt3hhe2n8reudaqkp.apps.googleusercontent.com'
        }).then(function() {
            const authInstance = gapi.auth2.getAuthInstance();
            
            authInstance.signIn({
                scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send'
            }).then(function(user) {
                const authResult = user.getAuthResponse();
                processGoogleAuth(authResult, leaseData);
                
                // Update button
                button.innerHTML = '<i class="bi bi-check"></i> Calendar Events Created!';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
                
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
                }, 2000);
            }).catch(function(error) {
                console.error('Google sign-in failed:', error);
                button.innerHTML = originalText;
                button.disabled = false;
                showNotification('Google sign-in failed. Please try again.', 'danger');
            });
        });
    });
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

// Setup Google Calendar Integration
function setupGoogleCalendarIntegration() {
    if (!window.currentLeaseData) {
        showNotification('No lease data available. Please upload and parse a lease first.', 'danger');
        return;
    }
    
    const button = document.getElementById('google-calendar-btn');
    const originalText = button.innerHTML;
    const statusDiv = document.getElementById('calendar-status');
    
    // Update button and show status
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Connecting to Google...';
    button.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Initializing Google OAuth...';
    
    // Use the modern Google Identity Services approach
    const initializeGIS = () => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: '232827582501-jg5m3642e9tkc28tt3hhe2n8reudaqkp.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => {
                if (tokenResponse.access_token) {
                    statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Creating calendar events and setting up reminders...';
                    
                    // Get user's email using the access token
                    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: {
                            'Authorization': `Bearer ${tokenResponse.access_token}`
                        }
                    })
                    .then(response => response.json())
                    .then(userInfo => {
                        // Convert lease start date to rent_first_due_iso format
                        const leaseStartDate = new Date(window.currentLeaseData.leaseStart);
                        const rentFirstDue = new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth() + 1, 1); // First day of next month
                        const rentFirstDueIso = rentFirstDue.toISOString().slice(0, 19) + '-05:00'; // Add timezone
                        
                        // Convert renewal dates
                        const leaseEndDate = new Date(window.currentLeaseData.leaseEnd);
                        const renewalStartDate = new Date(leaseEndDate.getFullYear(), leaseEndDate.getMonth() - 1, 1); // One month before lease end
                        const renewalEndDate = window.currentLeaseData.leaseEnd; // Use lease end date
                        
                        // Prepare data for backend - matching the exact schema
                        const calendarData = {
                            access_token: tokenResponse.access_token,
                            calendar_id: 'primary',
                            rent_first_due_iso: rentFirstDueIso,
                            renewal_start_date: renewalStartDate.toISOString().slice(0, 10), // YYYY-MM-DD format
                            renewal_end_date: renewalEndDate,
                            setup_email_reminders: true,
                            landlord_email: window.currentLeaseData.landlordEmail,
                            user_email: userInfo.email
                        };
                        
                        console.log('Sending calendar data:', calendarData);
                        
                        // Send to backend
                        return fetch('/api/google/events', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(calendarData)
                        });
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Backend response:', data);
                        
                        if (data.ok) {
                            button.innerHTML = '<i class="bi bi-check-circle"></i> Calendar & Reminders Set Up!';
                            button.classList.remove('btn-success');
                            button.classList.add('btn-outline-success');
                            
                            let message = 'Successfully connected to Google Calendar and set up rent reminders!';
                            
                            // Check if email reminders were set up
                            if (data.email_reminders_setup && data.created.email_reminder) {
                                const emailInfo = data.created.email_reminder;
                                if (emailInfo.confirmation_sent) {
                                    message += ` A confirmation email has been sent to ${emailInfo.confirmation_to}.`;
                                }
                                if (emailInfo.draft_created) {
                                    message += ' Email reminder drafts have been created.';
                                }
                            }
                            
                            statusDiv.innerHTML = `<div class="alert alert-success mb-0"><i class="bi bi-check-circle me-2"></i>${message}</div>`;
                            showNotification('Calendar events created and email reminders set up!', 'success');
                        } else {
                            throw new Error(data.error || data.message || 'Unknown error occurred');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        button.innerHTML = originalText;
                        button.disabled = false;
                        statusDiv.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Error setting up calendar and reminders. Please try again.</div>';
                        showNotification('Error setting up calendar and reminders', 'danger');
                    });
                } else {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    statusDiv.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Google authentication failed. Please try again.</div>';
                }
            }
        });
        
        statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Please sign in to Google...';
        tokenClient.requestAccessToken();
    };
    
    // Check if Google Identity Services is loaded
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        initializeGIS();
    } else {
        // If not loaded, show error
        button.innerHTML = originalText;
        button.disabled = false;
        statusDiv.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Google services not loaded. Please refresh the page.</div>';
        showNotification('Google services not loaded. Please refresh the page.', 'danger');
    }
}

// ==================== GOOGLE CALENDAR INTEGRATION ====================

// Note: Google Identity Services is loaded via the script tag in index.html

// Load Google API when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Google API will be available via the script tags in the HTML
    console.log('RentMinder app loaded successfully');
});
