import { useState, useEffect } from 'react';
import NavBar from '../../Common/Nav/Nav';
import CategoryCard from '../../Common/Cards/CategoryCard/CategoryCard.jsx';
import ApiClient from '../../../Util/ApiClient/ApiClient';
import CategoryHeader from '../../Common/Cards/CategoriesHeader/CategoriesHeader.jsx';
import toast from 'react-hot-toast';

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const getCategories = async () => {
        try {
            const response = await ApiClient.get("/categories");
            setCategories(response.data);
            setFilteredCategories(response.data); 
        } catch (error) {
            toast.error("Error cargando categories:", error.response?.data?.message);
        }
    };

    const categoryFilter = (query) => {
        setSearchQuery(query);
        if (query === '') {
            setFilteredCategories(categories);
        } else {
            const filtered = categories.filter(cat =>
                cat.name.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredCategories(filtered);
        }
    };

    useEffect(() => {
        getCategories();
    }, []);

    return (
        <>
            <div className="app-container">
                <NavBar />
                <div className="content-container">
                    <CategoryHeader
                        onBuscar={categoryFilter}
                    />
                    {filteredCategories.map((cat) => (
                        <CategoryCard
                            key={cat.id} 
                            category={cat} 
                            onActualizar={getCategories}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}