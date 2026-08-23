import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/frontend_assets/assets";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";

const Collection = () => {
  const { products, search, showSearch } = useContext(ShopContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilter, setShowFilter] = useState(false);
  const [category, setCategory] = useState(() => {
    const initial = searchParams.get('category');
    return initial ? [initial] : [];
  });
  const [subCategory, setSubCategory] = useState([]);
  const [sortType, setSortType] = useState('relevant');

  useEffect(() => {
    if (searchParams.get('category')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Toggle Category Filter
  const toggleCategory = (e) => {
    if (category.includes(e.target.value)) {
      setCategory(prev => prev.filter(item => item !== e.target.value));
    } else {
      setCategory(prev => [...prev, e.target.value]);
    }
  };

  // Toggle SubCategory Filter
  const toggleSubCategory = (e) => {
    if (subCategory.includes(e.target.value)) {
      setSubCategory(prev => prev.filter(item => item !== e.target.value));
    } else {
      setSubCategory(prev => [...prev, e.target.value]);
    }
  };

  // Filter + sort in one place, so the two can never fall out of step.
  const filterProducts = useMemo(() => {
    let list = products.slice();

    if (showSearch && search) {
      list = list.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (category.length > 0) {
      list = list.filter(item => category.includes(item.category));
    }
    if (subCategory.length > 0) {
      list = list.filter(item => subCategory.includes(item.subCategory));
    }

    if (sortType === 'low-high') list.sort((a, b) => a.price - b.price);
    if (sortType === 'high-low') list.sort((a, b) => b.price - a.price);

    return list;
  }, [products, search, showSearch, category, subCategory, sortType]);

  // Toggle Filter Visibility
  const toggleFilter = () => {
    setShowFilter(prevShowFilter => !prevShowFilter);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-10 pt-10 border-t">
      {/* Filter Options */}
      <div className="min-w-60">
        <p className="my-2 text-xl flex items-center gap-2 cursor-pointer hover:underline hover:transition-all" onClick={toggleFilter}>
          FILTER
          <img className={`h-3 sm:hidden ${showFilter ? 'rotate-90' : ''}`} src={assets.dropdown_icon} alt="Toggle Filter" />
        </p>
        {/* Category Filter */}
        <div className={`border border-gray-300 pl-5 py-3 mt-6 ${showFilter ? "" : "hidden"} sm:block`}>
          <p className="mb-3 text-sm font-medium uppercase">Categories</p>
          <div className="flex flex-col gap-2 text-sm font-light text-gray-700">
            {['Men', 'Women', 'Kids'].map(categoryItem => (
              <label key={categoryItem} className="gap-2 flex cursor-pointer">
                <input type="checkbox" className="w-3" value={categoryItem} checked={category.includes(categoryItem)} onChange={toggleCategory} /> {categoryItem}
              </label>
            ))}
          </div>
        </div>
        {/* SubCategory Filter */}
        <div className={`border border-gray-300 pl-5 py-3 my-5 ${showFilter ? "" : "hidden"} sm:block`}>
          <p className="mb-3 text-sm font-medium uppercase">Type</p>
          <div className="flex flex-col gap-2 text-sm font-light text-gray-700">
            {['Topwear', 'Bottomwear', 'Winterwear'].map(subCategoryItem => (
              <label key={subCategoryItem} className="gap-2 flex cursor-pointer">
                <input type="checkbox" className="w-3" value={subCategoryItem} checked={subCategory.includes(subCategoryItem)} onChange={toggleSubCategory} /> {subCategoryItem}
              </label>
            ))}
          </div>
        </div>
      </div>
      {/* Product Section */}
      <div className="flex-1">
        <div className="flex justify-between text-base sm:text-2xl mb-4">
          <Title text1={'ALL'} text2={'Collection'} />
          {/* Product Sort */}
          <select value={sortType} onChange={(e) => setSortType(e.target.value)} className="border border-gray-300 text-sm px-2">
            <option value="relevant">Sort by: Relevant</option>
            <option value="low-high">Sort by: Low</option>
            <option value="high-low">Sort by: High</option>
          </select>
        </div>
        {/* Display Products */}
        {filterProducts.length === 0 ? (
          <p className="py-20 text-center text-gray-500">No products match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6">
            {filterProducts.map((item, index) => (
              <ProductItem key={index} name={item.name} price={item.price} image={item.image} id={item._id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
