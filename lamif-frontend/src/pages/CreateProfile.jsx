import { useState } from 'react'
import axios from 'axios'

function CreateProfile() {
  const [formData, setFormData] = useState({
    bio: '',
    subjects: '',
    hourlyRate: '',
    education: ''
  })
  const [cvFile, setCvFile] = useState(null)

  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

 const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      console.log('Token:', token)
      
      const submitData = new FormData()
      submitData.append('bio', formData.bio)
      
      // Axios or the backend might receive the array differently depending on parsing.
      // But passing the joined string and splitting in backend is safer, or just JSON.stringify.
      // Wait, our backend expects an array. Let's send a comma separated string and let the backend handle it?
      // No, let's just append the string array elements, or pass the string and split it on backend.
      // Backend expects `req.body.subjects`. When using FormData, it sends as a string.
      // Let's modify backend to split it, OR we can append each subject.
      // For simplicity, I'll send it as a string and we'll fix backend if needed. Or we just append the array.
      // formData.append will convert arrays to strings anyway (e.g. "Math,Physics").
      
      submitData.append('subjects', formData.subjects)
      submitData.append('hourlyRate', Number(formData.hourlyRate))
      submitData.append('education', formData.education)
      
      if (cvFile) {
        submitData.append('cv', cvFile)
      }
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '/api/tutor/profile',
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      setMessage(response.data.message)
    } catch (error) {
      console.error('Error creating profile:', error)
      const errorMessage = error.response?.data?.message || 'Connection to server failed. Please check if the backend is running.'
      setMessage(errorMessage)
    }
  }
  return (
    <div className="auth-container">
      <h2>Create Tutor Profile</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="bio"
          placeholder="Your bio"
          value={formData.bio}
          onChange={handleChange}
        />
        <input
          type="text"
          name="subjects"
          placeholder="Subjects (comma separated e.g. Math, Physics)"
          value={formData.subjects}
          onChange={handleChange}
        />
        <input
          type="number"
          name="hourlyRate"
          placeholder="Hourly rate in ETB"
          value={formData.hourlyRate}
          onChange={handleChange}
        />
        <input
          type="text"
          name="education"
          placeholder="Your education background"
          value={formData.education}
          onChange={handleChange}
        />
        <label style={{ display: 'block', margin: '10px 0', textAlign: 'left', fontWeight: 'bold' }}>
          Upload CV (PDF/Doc)
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setCvFile(e.target.files[0])}
        />
        <button type="submit">Create Profile</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

export default CreateProfile