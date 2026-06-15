document.addEventListener('DOMContentLoaded', () => {
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

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 5, 0.95)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(5, 5, 5, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });

    // Dynamic Link Inputs
    const addLinkBtn = document.getElementById('add-link-btn');
    const linksContainer = document.getElementById('links-container');

    addLinkBtn.addEventListener('click', () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'link-input-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.marginTop = '8px';

        const input = document.createElement('input');
        input.type = 'url';
        input.name = 'links[]';
        input.placeholder = 'https://...';
        input.className = 'link-input';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-text';
        removeBtn.style.color = 'var(--danger)';
        removeBtn.textContent = 'Remover';
        removeBtn.onclick = () => wrapper.remove();

        wrapper.appendChild(input);
        wrapper.appendChild(removeBtn);
        linksContainer.appendChild(wrapper);
    });

    // File Upload Handling
    const fileInput = document.getElementById('files');
    const fileList = document.getElementById('file-list');
    const dropZone = document.getElementById('drop-zone');
    let uploadedFiles = new DataTransfer();

    const updateFileList = () => {
        fileList.innerHTML = '';
        Array.from(uploadedFiles.files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.type = 'button';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remover ficheiro';
            
            removeBtn.onclick = () => {
                const dt = new DataTransfer();
                Array.from(uploadedFiles.files)
                    .filter((_, i) => i !== index)
                    .forEach(f => dt.items.add(f));
                
                uploadedFiles = dt;
                fileInput.files = uploadedFiles.files;
                updateFileList();
            };

            fileItem.appendChild(fileName);
            fileItem.appendChild(removeBtn);
            fileList.appendChild(fileItem);
        });
    };

    fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            uploadedFiles.items.add(file);
        });
        fileInput.files = uploadedFiles.files;
        updateFileList();
    });

    // Drag and Drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        Array.from(dt.files).forEach(file => {
            uploadedFiles.items.add(file);
        });
        fileInput.files = uploadedFiles.files;
        updateFileList();
    });

    // Entity Type Toggle
    const entityRadios = document.querySelectorAll('input[name="entity_type"]');
    const companyGroup = document.getElementById('company-name-group');
    const companyInput = document.getElementById('company_name');

    entityRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'coletiva') {
                companyGroup.style.display = 'block';
                companyInput.required = true;
            } else {
                companyGroup.style.display = 'none';
                companyInput.required = false;
                companyInput.value = '';
            }
        });
    });

    // Form Submission
    const form = document.getElementById('car-request-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'A enviar...';
        submitBtn.style.opacity = '0.7';
        
        // Mock API call
        setTimeout(() => {
            alert('Pedido enviado com sucesso! A equipa Consulcar entrará em contacto em breve.');
            form.reset();
            uploadedFiles = new DataTransfer();
            fileInput.files = uploadedFiles.files;
            updateFileList();
            
            // Reset links
            linksContainer.innerHTML = `
                <div class="link-input-wrapper">
                    <input type="url" name="links[]" placeholder="https://..." class="link-input">
                </div>
            `;
            
            submitBtn.textContent = originalText;
            submitBtn.style.opacity = '1';
        }, 1500);
    });
});
