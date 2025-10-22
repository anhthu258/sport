import '../Styling/Login.css';
import LoginForm from '../components/LoginForm';

export default function Login() {
    const handleLogin = (username, password) => {
        console.log('Login attempt:', username, password);
    };

    return (
        <section className="login-container">
            <aside className='hero'>
                <h2>Login</h2>
            </aside>
            <LoginForm onLogin={handleLogin} />
        </section>
    );
}