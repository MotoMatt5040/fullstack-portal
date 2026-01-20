async function fetchData() {
  try {
    await fetch('https://jsonplaceholder.typicode.com/todos/2')
      .then((res) => res.json())
      .then((json) => console.log(json));
  } catch (error) {
    console.error(error);
  }
}

const fetchData1 = async () => {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/4');
    const json = await res.json();
    console.log(json);
  } catch (error) {
    console.error(error);
  }
};

const fetchPokemon = async () => {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/1');
    const json = await res.json();
    console.log(json);
  } catch (error) {
    console.error(error);
  }
};

const ImageUploader = () => {
  const [file, setFile] = useState(null);
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  }

  const handleUpload = async(e) => {
    e.preventDefault();

    if (!file) { return; }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result);
      } else {
        const errorResult = await response.json();
        console.error(('Upload failed:', errorResult));
      }

    } catch (error) {
      console.error(error);
    }
  }
}

fetchData();
fetchData1();
fetchPokemon();

module.exports = { fetchData, fetchData1, fetchPokemon };
