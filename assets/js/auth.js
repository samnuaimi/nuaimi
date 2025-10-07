// --- Product Upload Utilities (Globally scoped for HTML 'onclick') ---
    const API_PRODUCT_ENDPOINT = 'https://api.nuaimi.us/products';
    const API_FILE_UPLOAD_ENDPOINT = 'https://api.nuaimi.us/files/multiple';
    const messageElement = document.getElementById('message');
    
    // Helper function to show messages to the user for the product form
    function displayMessage(msg, isError = false) {
        messageElement.textContent = msg;
        messageElement.style.color = isError ? 'red' : 'green'; 
    }

    // Main function to handle the two-step product upload
    async function handleProductUpload() {
        // Retrieve the token from localStorage as established by your authentication logic
        const token = localStorage.getItem('token');
        
        if (!token) {
            displayMessage('Error: You must be logged in to upload a product.', true);
            return;
        }

        displayMessage('Processing...', false);
        const form = document.getElementById('productForm');
        
        // Basic Form Validation Check
        if (!form.checkValidity()) {
            displayMessage('Please fill out all required fields.', true);
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const imageFiles = formData.getAll('file'); // Get files using the key 'file'

        // --- STEP 1: Upload Images to /files/multiple (Requires Auth, path, and permissions) ---
        displayMessage('Step 1/2: Uploading images...', false);
        
        const imageFormData = new FormData();
        
        // Add required metadata for the file upload service
        // FIX: Must end path with '/' as per the server error message
        imageFormData.append('path', 'products/'); 
        imageFormData.append('permissions', 'public'); // Images should be publicly accessible
        
        // FIX: Changed 'file' to 'files' (plural) as expected by the /files/multiple API endpoint
        imageFiles.forEach(file => {
            imageFormData.append('files', file); 
        });

        let imageUrls = [];
        try {
            const imageResponse = await fetch(API_FILE_UPLOAD_ENDPOINT, {
                method: 'POST',
                headers: {
                    // Use the retrieved token here
                    'Authorization': `Bearer ${token}` 
                },
                body: imageFormData
            });

            if (!imageResponse.ok) {
                const errorText = await imageResponse.text();
                throw new Error(`Server Error (${imageResponse.status}): Image upload failed. Response: ${errorText.substring(0, 100)}...`);
            }

            const imageResult = await imageResponse.json();
            // FIX: Added imageResult.files check, as the response array might be under the key corresponding to the request field name ('files')
            imageUrls = imageResult.urls || imageResult.data || imageResult.files || (Array.isArray(imageResult) ? imageResult : []); 
            
            if (imageUrls.length === 0) {
                 throw new Error("Image upload succeeded but returned no URLs in the expected format.");
            }
            
        } catch (error) {
            displayMessage(`Image Upload Failed: ${error.message}`, true);
            // Stop further execution if Step 1 fails
            return;
        }


        // --- STEP 2: Submit Product Data (with URLs) to /products (Requires Auth) ---
        displayMessage('Step 2/2: Submitting product data...', false);
        
        // Build the final JSON payload
        const productPayload = {};
        formData.forEach((value, key) => {
            if (key !== 'file') { // Exclude the raw file data
                
                // Parse the 'tags' string into an array of trimmed strings
                if (key === 'tags') {
                    // Splits by comma, removes whitespace from each tag, and filters out empty strings
                    productPayload[key] = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                } 
                // Parse boolean
                else if (key === 'is_active') {
                    productPayload[key] = value === 'on';
                } 
                // Parse numbers
                else if (key === 'price' || key === 'stock') {
                    productPayload[key] = Number(value);
                } 
                // Default to string value for all other fields (name, description, currency, category, condition)
                else {
                    productPayload[key] = value;
                }
            }
        });
        
        // Add the array of image URLs to the payload
        productPayload.images = imageUrls;
        
        const now = new Date().toISOString();
        productPayload.updated_at = now;
        productPayload.created_at = now; 

        try {
            const productResponse = await fetch(API_PRODUCT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Sending JSON data
                    // Use the retrieved token here
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(productPayload)
            });

            if (!productResponse.ok) {
                const errorText = await productResponse.text();
                throw new Error(`Product submission failed with status ${productResponse.status}. Server response: ${errorText.substring(0, 100)}...`);
            }
            
            // Success
            const productResult = await productResponse.json();
            displayMessage(`Success! Product created. ID: ${productResult._id || 'N/A'}`, false);
            form.reset(); // Clear form after successful submission
            
        } catch (error) {
            displayMessage(`Product Submission Failed: ${error.message}`, true);
        }
    }

    // --- User's Main JS Logic (Authentication and Profile Handlers) ---
    document.addEventListener('DOMContentLoaded', async () => {
        // Check for token in localStorage immediately
        const token = localStorage.getItem('token');

        // Unified Handler for Login and Signup Forms
        const handleAuthForm = async (formId, endpoint, buildPayload) => {
            const form = document.getElementById(formId);
            if (!form) return;

            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const payload = buildPayload();

                try {
                    const res = await fetch(`https://api.nuaimi.us${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await res.json();
                    if (res.ok) {
                        console.log(`${formId === 'signupForm' ? 'Success! Redirecting...' : 'Welcome back. Redirecting...'}`);
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                            location.href = '/index.html';
                        }
                    } else {
                        console.error(data.message || 'Oops! Looks like something’s off, check your typing and give it another go.');
                    }
                } catch (err) {
                    console.error('Auth request error:', err);
                    console.error('An error occurred on our side. Please retry your request.');
                }
            });
        };

        handleAuthForm('signupForm', '/signup', () => ({
            first_name: document.getElementById('first_name').value,
            last_name: document.getElementById('last_name').value,
            email: document.getElementById('email').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        }));

        handleAuthForm('loginForm', '/login', () => ({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        }));

        // Handle Protected Content Visibility (Logic from the first file)
        const protectedContent = document.querySelectorAll('.protectedContent');
        const publicContent = document.querySelectorAll('.publicContent');

        protectedContent.forEach(el => {
            el.style.display = token ? 'block' : 'none';
        });

        publicContent.forEach(el => {
            el.style.display = token ? 'none' : 'block';
        });


        // Handle Logout Functionality (Combined/Improved logic)
        const signOutBtns = document.querySelectorAll('.signOut');

        signOutBtns.forEach(btn => {
            btn.addEventListener('click', async function (e) {
                e.preventDefault();
                try {
                    const res = await fetch('https://api.nuaimi.us/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (!res.ok) {
                        // Improved error logging from the second snippet
                        const errorText = await res.text();
                        console.warn('Logout failed on API side:', errorText);
                    }
                } catch (err) {
                    console.warn('Logout request failed (network/preflight error):', err);
                }
                // Always clear token and redirect regardless of API success/failure
                localStorage.removeItem('token');
                location.href = '/index.html';
            });
        });


        // Function to Load User Data
        const loadUserData = async () => {
            if (!token) return null; // Only attempt if token exists
            try {
                const res = await fetch('https://api.nuaimi.us/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    console.error('Failed to load user data - Response not OK:', res.status);
                    return null;
                }
                return await res.json();
            } catch (err) {
                console.error('Failed to load user (network error):', err);
                return null;
            }
        };

        // Profile Update and Dashboard Handlers
        const profileForm = document.getElementById('profileForm');
        const userAvatar = document.getElementById('userAvatar');
        const profilePreview = document.getElementById('profilePreview');

        if (token) {
            const user = await loadUserData();
            if (user) {
                // Dashboard user info
                if (document.getElementById('user-name')) {
                    document.getElementById('user-name').textContent = `${user.first_name} ${user.last_name}`;
                    // Assuming there is an element with id='username' in the dashboard context
                    if (document.getElementById('username')) {
                        document.getElementById('username').textContent = user.username;
                    }
                    if (user.profile_picture && userAvatar) {
                        userAvatar.src = user.profile_picture;
                    }
                }

                // Profile form info and update handler
                if (profileForm) {
                    // Populate form fields
                    document.getElementById('first_name').value = user.first_name || '';
                    document.getElementById('last_name').value = user.last_name || '';
                    document.getElementById('email').value = user.email || '';
                    document.getElementById('phone_number').value = user.phone_number || '';
                    document.getElementById('url_ink').value = user.url_ink || '';
                    document.getElementById('company_name').value = user.company_name || '';
                    document.getElementById('address_line_1').value = user.address_line_1 || '';
                    document.getElementById('address_line_2').value = user.address_line_2 || '';
                    document.getElementById('city_name').value = user.city_name || '';
                    document.getElementById('region').value = user.region || '';
                    document.getElementById('country_name').value = user.country_name || '';
                    document.getElementById('zip').value = user.zip || '';
                    if (user.profile_picture && profilePreview) {
                        profilePreview.src = user.profile_picture;
                    }
                    
                    const profilePicInput = document.getElementById('profilePic');
                    
                    if (profilePicInput) {
                        profilePicInput.addEventListener('change', function () {
                            const file = this.files[0];
                            if (file && profilePreview) {
                                profilePreview.src = URL.createObjectURL(file);
                            }
                        });
                    }
                    
                    // Profile update handler
                    profileForm.addEventListener('submit', async function (e) {
                        e.preventDefault();
                        // Collect current form values
                        const first_name = document.getElementById('first_name').value;
                        const last_name = document.getElementById('last_name').value;
                        const email = document.getElementById('email').value;
                        const phone_number = document.getElementById('phone_number').value;
                        const url_ink = document.getElementById('url_ink').value;
                        const company_name = document.getElementById('company_name').value;
                        const address_line_1 = document.getElementById('address_line_1').value;
                        const address_line_2 = document.getElementById('address_line_2').value;
                        const city_name = document.getElementById('city_name').value;
                        const region = document.getElementById('region').value;
                        const country_name = document.getElementById('country_name').value;
                        const zip = document.getElementById('zip').value;
                        
                        const picFile = profilePicInput ? profilePicInput.files[0] : null;
                        let profile_picture = user.profile_picture;

                        if (picFile) {
                            const formData = new FormData();
                            formData.append('path', `profile/${user._id}`);
                            formData.append('permissions', 'public');
                            formData.append('file', picFile);
                            
                            try {
                                const uploadRes = await fetch('https://api.nuaimi.us/files/single', {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` },
                                    body: formData
                                });
                                const uploadData = await uploadRes.json();
                                if (uploadRes.ok && uploadData.url) {
                                    profile_picture = uploadData.url;
                                } else {
                                    // Using custom modal UI instead of alert()
                                    console.error(uploadData.message || 'Profile picture upload failed');
                                    // Here you'd show a custom message box instead of using alert
                                    return;
                                }
                            } catch (err) {
                                console.error('Profile picture upload error:', err);
                                // Here you'd show a custom message box instead of using alert
                                return;
                            }
                        }

                        const payload = { first_name, last_name, email, profile_picture, phone_number, url_ink, company_name, address_line_1, address_line_2, city_name, region, country_name, zip };
                        
                        try {
                            const patchRes = await fetch(`https://api.nuaimi.us/users_data/${user._id}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify(payload)
                            });
                            const patchData = await patchRes.json();
                            if (patchRes.ok) {
                                // Using custom modal UI instead of alert()
                                console.log('Profile updated successfully!');
                                // Update UI to show success
                            } else {
                                // Using custom modal UI instead of alert()
                                console.error(patchData.message || 'Profile update failed');
                            }
                        } catch (err) {
                            console.error('Profile update request error:', err);
                            // Using custom modal UI instead of alert()
                            console.error('An error occurred on our side. Please retry your request.');
                        }
                    });
                }
            }
        }

        // Handle Forgot Password Form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const email = document.getElementById('identifier').value;
                try {
                    const res = await fetch('https://api.nuaimi.us/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        // Using custom modal UI instead of alert()
                        console.log('Reset instructions sent! Check your email.');
                        location.href = '/reset-password.html';
                    } else {
                        // Using custom modal UI instead of alert()
                        console.error(data.message || 'Forgot password request failed');
                    }
                } catch (err) {
                    console.error('Forgot password error:', err);
                    // Using custom modal UI instead of alert()
                    console.error('An error occurred while requesting reset');
                }
            });
        }

        // Handle Reset Password Form
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const reset_key = document.getElementById('reset_key').value;
                const email = document.getElementById('email').value;
                const new_password = document.getElementById('new_Password').value;
                const payload = { reset_key, email, new_password };
                try {
                    const res = await fetch('https://api.nuaimi.us/reset-password', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (res.ok) {
                        // Using custom modal UI instead of alert()
                        console.log('Password reset successful!');
                        location.href = '/login.html';
                    } else {
                        // Using custom modal UI instead of alert()
                        console.error(data.message || 'Password reset failed');
                    }
                } catch (err) {
                    console.error('Reset password error:', err);
                    // Using custom modal UI instead of alert()
                    console.error('An error occurred on our side. Please retry your request.');
                }
            });
        }

        // Handle Change Password Form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const old_password = document.getElementById('old_password').value;
                const new_password = document.getElementById('new_password').value;
                const payload = { old_password, new_password };
                try {
                    const res = await fetch('https://api.nuaimi.us/update-password', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (res.ok) {
                        // Using custom modal UI instead of alert()
                        console.log('Password updated successfully!');
                        location.href = '/profile.html';
                    } else {
                        // Using custom modal UI instead of alert()
                        console.error(data.message || 'Password update failed');
                    }
                } catch (err) {
                    console.error('Password update error:', err);
                    // Using custom modal UI instead of alert()
                    console.error('An error occurred on our side. Please retry your request.');
                }
            });
        }
    });