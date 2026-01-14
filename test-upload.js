const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const EMAIL = 'yohowslife16@gmail.com';
const PASSWORD = 'idk1234';

async function testCompleteFlow() {
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!  Token:', token. substring(0, 20) + '...\n');

    // 2. Create a car
    console.log('🚗 Creating a car...');
    const carResponse = await axios.post(
      `${BASE_URL}/cars`,
      {
        make: 'Honda',
        model: 'Civic Type R',
        year: 2024,
        color: 'Championship White',
        horsepower: 315,
        stage: '2',
      },
      {
        headers:  { Authorization: `Bearer ${token}` },
      }
    );
    
    console.log('📋 Car Response:', JSON.stringify(carResponse. data, null, 2));
    
    // Check different possible response structures
    const carId = carResponse.data. data?. id || carResponse.data.car?. id || carResponse.data.id;
    
    if (! carId) {
      console.error('❌ Could not find car ID in response');
      console.error('Response structure:', Object.keys(carResponse.data));
      return;
    }
    
    console.log('✅ Car created with ID:', carId, '\n');

    // 3. Download test image
    console.log('📥 Downloading test image...');
    const imageUrl = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800';
    const imagePath = './test-car.jpg';
    
    const imageResponse = await axios. get(imageUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(imagePath);
    imageResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log('✅ Test image saved to:', imagePath, '\n');

    // 4. Upload image
    console.log('📤 Uploading image...');
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('is_primary', 'true');

    const uploadResponse = await axios. post(
      `${BASE_URL}/cars/${carId}/images`,
      form,
      {
        headers: {
          ... form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('\n🎉 SUCCESS! Upload complete! ');
    console.log('🔗 Image URL:', uploadResponse.data.image_url);
    console.log('\n���� Full response:', JSON.stringify(uploadResponse.data, null, 2));

    // 5. Verify image is accessible
    console.log('\n🌐 Testing image URL...');
    const imageCheck = await axios.head(uploadResponse.data.image_url);
    console.log('✅ Image is accessible!  Status:', imageCheck.status);

    // Cleanup
    fs. unlinkSync(imagePath);
    console.log('\n🧹 Cleaned up test file');

  } catch (error) {
    console.error('\n❌ Error Details: ');
    
    if (error.response) {
      console.error('   Status:', error. response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
      console.error('   Full Response:', JSON. stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response from server');
      console.error('   Is the server running on', BASE_URL, '?');
      console.error('   Error:', error.message);
    } else {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

testCompleteFlow();