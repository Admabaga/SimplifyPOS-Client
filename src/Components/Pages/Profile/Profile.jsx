import { useState, useEffect } from 'react';
import NavBar from '../../Common/Nav/Nav.jsx'
import ProfileForm from '../../Common/Forms/ProfileForm/ProfileForm.jsx'
import PasswordForm from '../../Common/Forms/PasswordForm/PasswordForm.jsx';
import ApiClient from '../../../Util/ApiClient/ApiClient.jsx';
import toast from 'react-hot-toast';
import { HeaderProfile, ProfileHeader } from '../../Common/Cards/ProfileHeader/ProfileHeader.jsx'
import './Profile.css';

const Profile = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await ApiClient.get('/users',
                );
                setFormData(response.data);
            } catch (error) {
                toast.error(error.response?.data?.message || "Error al traer usuario.");
            }
        };
        getUser();
    }, []);

    return (
        <>
            <div className="app-container">
                <NavBar />
                <div className="content-container">
                    <HeaderProfile />
                    <div className='profile-container'>
                        <ProfileHeader
                            formData={formData}
                        ></ProfileHeader>
                        <div className="profile-tabs-container">
                            <nav className="profile-tabs-nav">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`profile-tab-button ${activeTab === 'profile' ? 'profile-tab-button--active' : ''}`}
                                >
                                    Perfil
                                    {activeTab === 'profile' && <div className="profile-tab-indicator"></div>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`profile-tab-button ${activeTab === 'password' ? 'profile-tab-button--active' : ''}`}
                                >
                                    Contraseña
                                    {activeTab === 'password' && <div className="profile-tab-indicator"></div>}
                                </button>
                            </nav>
                        </div>
                        {activeTab === 'profile' ? (
                            <div className="profile-info-section">
                                <ProfileForm
                                    formData={formData}
                                    setFormData={setFormData}
                                ></ProfileForm>
                            </div>
                        ) : (
                            <div className="profile-info-section">
                                <PasswordForm></PasswordForm>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;